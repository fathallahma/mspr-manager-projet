import secrets
import json
import os
import psycopg2
from datetime import datetime
import hashlib
import qrcode
import io
import base64

def generate_password(length=24):
    """Génère un mot de passe de 24 caractères composé uniquement de l'alphabet Base64url (a-z, A-Z, 0-9, _-) pour éviter tout problème de copie ou d'encodage."""
    # 18 octets → 24 caractères en Base64 urlsafe
    while True:
        pwd = base64.urlsafe_b64encode(secrets.token_bytes(18)).decode().rstrip('=')
        if len(pwd) == length:
            return pwd

def get_db_connection():
    """Établit une connexion à la base de données PostgreSQL"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'mspr_db'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'password'),
        port=os.getenv('DB_PORT', '5432')
    )

def hash_password(password):
    """Hash le mot de passe avec SHA-512"""
    return hashlib.sha512(password.encode()).hexdigest()

def handle(event, context):
    try:
        # ---------- Lecture du corps ----------
        body = json.loads(getattr(event, 'body', '') or '{}')
        username = body.get('username', '').strip()
        if not username:
            return {"statusCode": 400,
                    "body": json.dumps({"error": "Username is required", "success": False})}

        # ---------- Connexion & vérif ----------
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM users WHERE username=%s", (username,))
        if cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 409,
                    "body": json.dumps({"error": f"User '{username}' already exists", "success": False})}

        # ---------- Génération ----------
        password = generate_password()
        hashed = hash_password(password)
        now = datetime.now()
        cur.execute(
            """INSERT INTO users (username, password, gendate, expired)
               VALUES (%s, %s, %s, %s) RETURNING id""",
            (username, hashed, now, False))
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()

        # ---------- QR Code ----------
        buf = io.BytesIO()
        qrcode.make(password).save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode()

        return {"statusCode": 200,
                "body": json.dumps({
                    "success": True,
                    "user_id": user_id,
                    "username": username,
                    "password": password,        # ↙︎ à enlever en prod
                    "gendate": now.isoformat(),
                    "qrcode": qr_b64
                })}

    except psycopg2.Error as e:
        return {"statusCode": 500,
                "body": json.dumps({"error": f"Database error: {e}", "success": False})}
    except json.JSONDecodeError:
        return {"statusCode": 400,
                "body": json.dumps({"error": "Invalid JSON in request body", "success": False})}
    except Exception as e:
        return {"statusCode": 500,
                "body": json.dumps({"error": f"Internal server error: {e}", "success": False})}