import unittest
from unittest.mock import patch, MagicMock
import json
from datetime import datetime, timedelta
from handler import handle, hash_password, verify_totp, is_account_expired

class TestAuthenticateUser(unittest.TestCase):
    
    def test_hash_password(self):
        """Test du hashage des mots de passe"""
        password = "test_password"
        hashed = hash_password(password)
        self.assertIsInstance(hashed, str)
        self.assertNotEqual(password, hashed)
        self.assertEqual(len(hashed), 64)  # SHA-256 produit un hash de 64 caractères
    
    def test_verify_totp_valid(self):
        """Test de vérification TOTP avec un secret valide"""
        import pyotp
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        current_token = totp.now()
        
        result = verify_totp(secret, current_token)
        self.assertTrue(result)
    
    def test_verify_totp_invalid(self):
        """Test de vérification TOTP avec un token invalide"""
        import pyotp
        secret = pyotp.random_base32()
        
        result = verify_totp(secret, "000000")
        self.assertFalse(result)
    
    def test_is_account_expired_recent(self):
        """Test avec un compte récent (non expiré)"""
        recent_date = datetime.now() - timedelta(days=30)
        result = is_account_expired(recent_date)
        self.assertFalse(result)
    
    def test_is_account_expired_old(self):
        """Test avec un compte ancien (expiré)"""
        old_date = datetime.now() - timedelta(days=200)
        result = is_account_expired(old_date)
        self.assertTrue(result)
    
    @patch('handler.get_db_connection')
    def test_handle_missing_credentials(self, mock_db):
        """Test avec identifiants manquants"""
        event = MagicMock()
        event.body = json.dumps({})
        context = MagicMock()
        
        result = handle(event, context)
        
        self.assertEqual(result["statusCode"], 400)
        body = json.loads(result["body"])
        self.assertFalse(body["success"])
        self.assertIn("Username and password are required", body["error"])
    
    @patch('handler.get_db_connection')
    def test_handle_user_not_found(self, mock_db):
        """Test avec utilisateur inexistant"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        mock_conn.cursor.return_value = mock_cursor
        mock_db.return_value = mock_conn
        
        event = MagicMock()
        event.body = json.dumps({
            "username": "nonexistent",
            "password": "password"
        })
        context = MagicMock()
        
        result = handle(event, context)
        
        self.assertEqual(result["statusCode"], 401)
        body = json.loads(result["body"])
        self.assertFalse(body["success"])
        self.assertIn("Invalid username or password", body["error"])

if __name__ == '__main__':
    unittest.main() 