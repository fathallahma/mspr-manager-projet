#!/usr/bin/env python3
"""
Script de test local pour les fonctions MSPR
Permet de tester les fonctions sans déployer sur OpenFaaS
"""

import sys
import os
import json
from unittest.mock import MagicMock

# Ajouter les chemins des modules
sys.path.append('./generate-password')
sys.path.append('./generate-2fa')
sys.path.append('./authenticate-user')

# Définir les variables d'environnement pour les tests locaux
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_NAME'] = 'mspr_db'
os.environ['DB_USER'] = 'mspr_user'
os.environ['DB_PASSWORD'] = 'mspr_password'
os.environ['DB_PORT'] = '5432'

def test_generate_password():
    """Test de la fonction generate-password"""
    print("🔐 Test de la fonction generate-password...")
    
    try:
        # Importer la fonction depuis le bon module
        import handler as generate_password_handler
        
        # Créer un événement simulé
        event = MagicMock()
        event.body = json.dumps({"username": "test_user_local"})
        context = MagicMock()
        
        # Appeler la fonction
        result = generate_password_handler.handle(event, context)
        
        print(f"Status Code: {result['statusCode']}")
        response_body = json.loads(result['body'])
        print(f"Response: {json.dumps(response_body, indent=2)}")
        
        if result['statusCode'] == 200:
            print("✅ generate-password fonctionne correctement !")
            return response_body.get('username'), response_body.get('password')
        else:
            print("❌ Erreur dans generate-password")
            return None, None
            
    except Exception as e:
        print(f"❌ Exception dans generate-password: {e}")
        return None, None

def test_generate_2fa(username):
    """Test de la fonction generate-2fa"""
    print(f"\n🔑 Test de la fonction generate-2fa pour {username}...")
    
    try:
        # Changer le répertoire et importer
        current_dir = os.getcwd()
        os.chdir('./generate-2fa')
        
        import handler as generate_2fa_handler
        
        # Créer un événement simulé
        event = MagicMock()
        event.body = json.dumps({"username": username})
        context = MagicMock()
        
        # Appeler la fonction
        result = generate_2fa_handler.handle(event, context)
        
        # Revenir au répertoire original
        os.chdir(current_dir)
        
        print(f"Status Code: {result['statusCode']}")
        response_body = json.loads(result['body'])
        print(f"Response: {json.dumps(response_body, indent=2)}")
        
        if result['statusCode'] == 200:
            print("✅ generate-2fa fonctionne correctement !")
            return response_body.get('mfa_secret')
        else:
            print("❌ Erreur dans generate-2fa")
            return None
            
    except Exception as e:
        print(f"❌ Exception dans generate-2fa: {e}")
        os.chdir(current_dir)  # S'assurer de revenir au répertoire original
        return None

def test_authenticate_user(username, password, mfa_secret=None):
    """Test de la fonction authenticate-user"""
    print(f"\n✅ Test de la fonction authenticate-user pour {username}...")
    
    try:
        # Changer le répertoire et importer
        current_dir = os.getcwd()
        os.chdir('./authenticate-user')
        
        import handler as authenticate_user_handler
        
        # Générer un code TOTP si on a un secret 2FA
        totp_code = None
        if mfa_secret:
            import pyotp
            totp = pyotp.TOTP(mfa_secret)
            totp_code = totp.now()
            print(f"Code TOTP généré: {totp_code}")
        
        # Créer un événement simulé
        event_data = {
            "username": username,
            "password": password
        }
        if totp_code:
            event_data["totp_code"] = totp_code
            
        event = MagicMock()
        event.body = json.dumps(event_data)
        context = MagicMock()
        
        # Appeler la fonction
        result = authenticate_user_handler.handle(event, context)
        
        # Revenir au répertoire original
        os.chdir(current_dir)
        
        print(f"Status Code: {result['statusCode']}")
        response_body = json.loads(result['body'])
        print(f"Response: {json.dumps(response_body, indent=2)}")
        
        if result['statusCode'] == 200:
            print("✅ authenticate-user fonctionne correctement !")
        else:
            print("❌ Erreur dans authenticate-user")
            
    except Exception as e:
        print(f"❌ Exception dans authenticate-user: {e}")
        os.chdir(current_dir)  # S'assurer de revenir au répertoire original

def main():
    """Fonction principale de test"""
    print("🚀 Test des fonctions MSPR en local")
    print("=" * 50)
    
    # Changer vers le répertoire generate-password pour le premier test
    current_dir = os.getcwd()
    os.chdir('./generate-password')
    
    # Test 1: Générer un mot de passe
    username, password = test_generate_password()
    
    # Revenir au répertoire principal
    os.chdir(current_dir)
    
    if username and password:
        # Test 2: Générer un secret 2FA
        mfa_secret = test_generate_2fa(username)
        
        # Test 3: Authentifier l'utilisateur
        test_authenticate_user(username, password, mfa_secret)
    
    print("\n" + "=" * 50)
    print("🏁 Tests terminés !")

if __name__ == "__main__":
    main() 