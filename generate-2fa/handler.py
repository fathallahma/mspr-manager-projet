import secrets
import string
import json
import os
import psycopg2
import qrcode
import io
import base64
import pyotp
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from urllib.parse import quote

# Chargement clé AES-256-GCM depuis la variable d'environnement (Base64 -> 32 octets)
_RAW_KEY_B64 = os.getenv('MFA_KEY_B64')
# Si la variable d'env est absente, tenter de lire le secret monté "mfa-key"
if not _RAW_KEY_B64:
    for p in ('/var/openfaas/secrets/MFA_KEY_B64', '/var/openfaas/secrets/mfa-key'):
        try:
            with open(p, 'r', encoding='utf-8') as fp:
                _RAW_KEY_B64 = fp.read().strip()
                break
        except FileNotFoundError:
            continue

if not _RAW_KEY_B64:
    raise ValueError("Environment variable MFA_KEY_B64 (base64-encoded 32-byte AES key) is required or secret must exist")

try:
    AES_KEY = base64.b64decode(_RAW_KEY_B64)
    if len(AES_KEY) != 32:
        raise ValueError
except Exception:
    raise ValueError("MFA_KEY_B64 must be base64 of 32 bytes (256 bits)")

def generate_2fa_secret():
    """Génère un secret 2FA aléatoire de 32 caractères"""
    return pyotp.random_base32()

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

def generate_qr_code(username, secret, issuer="COFRAP"):
    """Génère un QR code pour l'authentification 2FA"""
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=username,
        issuer_name=issuer
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    qr_image = qr.make_image(fill_color="black", back_color="white")
    
    # Convertir en base64
    buffer = io.BytesIO()
    qr_image.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return qr_base64, totp_uri

# ---------------- Chiffrement AES-GCM ----------------
def encrypt_secret(secret: str):
    """Chiffre le secret TOTP avec AES-256-GCM, renvoie nonce+ciphertext encodés Base64"""
    aesgcm = AESGCM(AES_KEY)
    nonce = secrets.token_bytes(12)  # 96-bit nonce recommandé
    ct = aesgcm.encrypt(nonce, secret.encode(), None)
    return base64.b64encode(nonce + ct).decode()

def handle(event, context):
    try:
        # Parse le body de la requête
        if hasattr(event, 'body'):
            body = json.loads(event.body) if event.body else {}
        else:
            body = {}
        
        username = body.get('username', '').strip()
        
        if not username:
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "error": "Username is required",
                    "success": False
                })
            }
        
        # Connexion à la base de données
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Vérifier si l'utilisateur existe
        cursor.execute("SELECT id, username, mfa FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return {
                "statusCode": 404,
                "body": json.dumps({
                    "error": f"User '{username}' not found",
                    "success": False
                })
            }
        
        user_id, username, existing_mfa = user
        
        # Vérifier si l'utilisateur a déjà un secret 2FA
        if existing_mfa:
            cursor.close()
            conn.close()
            return {
                "statusCode": 409,
                "body": json.dumps({
                    "error": f"User '{username}' already has 2FA enabled",
                    "success": False,
                    "message": "Use the existing 2FA secret or disable it first"
                })
            }
        
        # Générer un nouveau secret 2FA
        mfa_secret = generate_2fa_secret()
        
        # Chiffrer le secret avant stockage
        encrypted_secret = encrypt_secret(mfa_secret)
        
        # Mettre à jour la base de données avec le secret 2FA chiffré
        cursor.execute("""
            UPDATE users 
            SET mfa = %s 
            WHERE id = %s
        """, (encrypted_secret, user_id))
        
        conn.commit()
        
        # Générer le QR code
        qr_base64, totp_uri = generate_qr_code(username, mfa_secret)
        
        cursor.close()
        conn.close()
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "success": True,
                "username": username,
                "mfa_secret": mfa_secret,
                "qr_code": qr_base64,
                "totp_uri": totp_uri,
                "message": f"2FA secret generated successfully for user '{username}'",
                "instructions": "Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)"
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