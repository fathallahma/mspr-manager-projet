import unittest
from unittest.mock import patch, MagicMock
import json
from handler import handle, generate_2fa_secret, generate_qr_code

class TestGenerate2FA(unittest.TestCase):
    
    def test_generate_2fa_secret(self):
        """Test de génération du secret 2FA"""
        secret = generate_2fa_secret()
        self.assertIsInstance(secret, str)
        self.assertGreater(len(secret), 10)  # Le secret doit avoir une longueur décente
    
    @patch('handler.get_db_connection')
    def test_handle_missing_username(self, mock_db):
        """Test avec username manquant"""
        event = MagicMock()
        event.body = json.dumps({})
        context = MagicMock()
        
        result = handle(event, context)
        
        self.assertEqual(result["statusCode"], 400)
        body = json.loads(result["body"])
        self.assertFalse(body["success"])
        self.assertIn("Username is required", body["error"])
    
    @patch('handler.get_db_connection')
    def test_handle_user_not_found(self, mock_db):
        """Test avec utilisateur inexistant"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None
        mock_conn.cursor.return_value = mock_cursor
        mock_db.return_value = mock_conn
        
        event = MagicMock()
        event.body = json.dumps({"username": "nonexistent"})
        context = MagicMock()
        
        result = handle(event, context)
        
        self.assertEqual(result["statusCode"], 404)
        body = json.loads(result["body"])
        self.assertFalse(body["success"])
        self.assertIn("not found", body["error"])

if __name__ == '__main__':
    unittest.main() 