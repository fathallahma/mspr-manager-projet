import json
import os
import psycopg2
import hashlib
import pyotp
from datetime import datetime, timedelta
import base64, secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def get_db_connection():
    """Établit une connexion à la base de données PostgreSQL"""
    db_password = os.getenv('DB_PASSWORD')
    if db_password is None:
        for p in ('/var/openfaas/secrets/DB_PASSWORD', '/var/openfaas/secrets/db-creds'):
            try:
                with open(p, 'r', encoding='utf-8') as fp:
                    db_password = fp.read().strip()
                    break
            except FileNotFoundError:
                continue
        else:
            db_password = 'password'

    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'mspr_db'),
        user=os.getenv('DB_USER', 'postgres'),
        password=db_password,
        port=os.getenv('DB_PORT', '5432')
    )

def hash_password(password):
    """Hash le mot de passe avec SHA-512"""
    return hashlib.sha512(password.encode()).hexdigest()

# --- AES-256-GCM setup (même clé que generate-2fa) ---
_RAW_KEY_B64 = os.getenv('MFA_KEY_B64')
# Si la variable n'est pas définie, lire le secret monté "mfa-key"
if not _RAW_KEY_B64:
    for p in ('/var/openfaas/secrets/MFA_KEY_B64', '/var/openfaas/secrets/mfa-key'):
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                _RAW_KEY_B64 = fp.read().strip()
                break
        except FileNotFoundError:
            continue

if not _RAW_KEY_B64:
    raise ValueError("Environment variable MFA_KEY_B64 missing for decrypting 2FA secret (env var or secret)")
AES_KEY = base64.b64decode(_RAW_KEY_B64)
if len(AES_KEY) != 32:
    raise ValueError("MFA_KEY_B64 must decode to 32 bytes")

def decrypt_secret(enc_b64: str) -> str:
    """Décrypte nonce+ciphertext base64 en secret TOTP"""
    data = base64.b64decode(enc_b64)
    nonce, ct = data[:12], data[12:]
    return AESGCM(AES_KEY).decrypt(nonce, ct, None).decode()

def verify_totp(secret, token):
    """Vérifie le code TOTP 2FA"""
    if not secret or not token:
        return False
    
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)  # Permet une fenêtre de tolérance de 30 secondes
    except Exception:
        return False

def is_account_expired(gendate, inactive_months=6):
    """Vérifie si le compte a expiré (6 mois d'inactivité)"""
    if not gendate:
        return True
    
    expiration_date = gendate + timedelta(days=inactive_months * 30)
    return datetime.now() > expiration_date

def mark_account_expired(cursor, user_id):
    """Marque un compte comme expiré"""
    cursor.execute("""
        UPDATE users 
        SET expired = %s 
        WHERE id = %s
    """, (True, user_id))

def handle(event, context):
    try:
        # Parse le body de la requête
        if hasattr(event, 'body'):
            body = json.loads(event.body) if event.body else {}
        else:
            body = {}
        
        username = body.get('username', '').strip()
        password = body.get('password', '').strip()
        totp_code = body.get('totp_code', '').strip()
        
        if not username or not password:
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "error": "Username and password are required",
                    "success": False
                })
            }
        
        # Connexion à la base de données
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Récupérer les informations de l'utilisateur
        cursor.execute("""
            SELECT id, username, password, mfa, gendate, expired 
            FROM users 
            WHERE username = %s
        """, (username,))
        
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return {
                "statusCode": 401,
                "body": json.dumps({
                    "error": "Invalid username or password",
                    "success": False
                })
            }
        
        user_id, db_username, db_password, mfa_secret, gendate, is_expired = user
        
        # Vérifier si le compte est expiré ou doit être marqué comme tel
        if is_expired or is_account_expired(gendate):
            if not is_expired:
                mark_account_expired(cursor, user_id)
                conn.commit()
            
            cursor.close()
            conn.close()
            return {
                "statusCode": 403,
                "body": json.dumps({
                    "error": "Account has expired due to inactivity (6 months)",
                    "success": False,
                    "expired": True,
                    "message": "Please contact administrator to reactivate your account"
                })
            }
        
        # Support des anciens comptes SHA-256 (64 hex) et nouveaux SHA-512 (128 hex)
        if len(db_password) == 64:
            hashed_input_password = hashlib.sha256(password.encode()).hexdigest()
        else:
            hashed_input_password = hash_password(password)  # SHA-512

        if hashed_input_password != db_password:
            print("DEBUG auth mismatch:", username, hashed_input_password[:16], db_password[:16])
            cursor.close()
            conn.close()
            return {
                "statusCode": 401,
                "body": json.dumps({
                    "error": "Invalid username or password",
                    "success": False
                })
            }
        
        # Vérifier la 2FA si elle est configurée
        if mfa_secret:
            # Décrypter le secret si chiffré (longueur base64 > 32 typiquement)
            try:
                if len(mfa_secret) > 40:
                    mfa_plain = decrypt_secret(mfa_secret)
                else:
                    mfa_plain = mfa_secret  # secret non chiffré legacy
            except Exception:
                cursor.close(); conn.close()
                return {"statusCode":500,"body":json.dumps({"error":"Failed to decrypt 2FA secret","success":False})}
            
            if not totp_code:
                cursor.close()
                conn.close()
                return {
                    "statusCode": 400,
                    "body": json.dumps({
                        "error": "2FA code is required",
                        "success": False,
                        "requires_2fa": True
                    })
                }
            
            if not verify_totp(mfa_plain, totp_code):
                cursor.close()
                conn.close()
                return {
                    "statusCode": 401,
                    "body": json.dumps({
                        "error": "Invalid 2FA code",
                        "success": False,
                        "requires_2fa": True
                    })
                }
        
        # Authentification réussie - mettre à jour la date de dernière activité
        cursor.execute("""
            UPDATE users 
            SET gendate = %s 
            WHERE id = %s
        """, (datetime.now(), user_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("DEBUG auth success", username)
        return {
            "statusCode": 200,
            "body": json.dumps({
                "success": True,
                "username": username,
                "user_id": user_id,
                "message": "Authentication successful",
                "has_2fa": bool(mfa_secret),
                "last_activity": datetime.now().isoformat()
            })
        }
        
    except psycopg2.Error as e:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": f"Database error: {str(e)}",
                "success": False
            })
        }
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "body": json.dumps({
                "error": "Invalid JSON in request body",
                "success": False
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": f"Internal server error: {str(e)}",
                "success": False
            })
        } 