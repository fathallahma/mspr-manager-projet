import secrets
import string
import qrcode
import io
import base64

def generate_password(length=24):
    characters = string.ascii_letters + string.digits + "!@#$%^&*()_+-=[]{}"
    return ''.join(secrets.choice(characters) for _ in range(length))

def handle(event, context):
    username = event.body.strip() or "unknown_user"
    password = generate_password()

    # QR Code
    qr = qrcode.make(password)
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    return {
        "username": username,
        "plainPassword": password,
        "qrcode": qr_base64
    }
