#!/usr/bin/env python3
"""
Mock OpenFaaS Server pour tests frontend MSPR COFRAP
Simule les endpoints OpenFaaS pour permettre au frontend de fonctionner localement
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import json

# Importer les fonctions directement depuis simple_test.py
sys.path.append(os.path.dirname(__file__))

# Import des fonctions depuis les modules
exec(open('generate-password/handler.py').read(), globals())
generate_password_handler = handle

exec(open('generate-2fa/handler.py').read(), globals())
generate_2fa_handler = handle

exec(open('authenticate-user/handler.py').read(), globals())
authenticate_user_handler = handle

app = Flask(__name__)
CORS(app)  # Permettre les requêtes CORS depuis le frontend React

def format_json_request(data):
    """Convertir les données de requête en format JSON string pour les handlers"""
    return json.dumps(data).encode('utf-8')

@app.route('/function/generate-password', methods=['POST'])
def generate_password():
    """Endpoint pour la génération de mot de passe"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        print(f"📝 generate-password appelé avec: {data}")
            
        # Simuler l'objet req d'OpenFaaS
        class MockReq:
            def __init__(self, body):
                self.body = body
        
        # Reload du handler pour generate-password
        exec(open('generate-password/handler.py').read(), globals())
        req = MockReq(format_json_request(data))
        # Ajouter un contexte vide
        context = {}
        result = handle(req, context)
        
        print(f"🔄 Résultat brut: {result}")
        
        # Parser le résultat (peut être dict ou string JSON)
        if isinstance(result, dict):
            parsed = result
        elif isinstance(result, str) and result.startswith('{'):
            parsed = json.loads(result)
        else:
            return {"error": str(result)}, 400
            
        if "error" in parsed:
            if "already exists" in parsed["error"]:
                return parsed, 409
            else:
                return parsed, 400
        return parsed, 200
            
    except Exception as e:
        print(f"❌ Erreur generate-password: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/function/generate-2fa', methods=['POST'])
def generate_2fa():
    """Endpoint pour la génération 2FA"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        print(f"📝 generate-2fa appelé avec: {data}")
            
        # Simuler l'objet req d'OpenFaaS
        class MockReq:
            def __init__(self, body):
                self.body = body
        
        # Reload du handler pour generate-2fa
        exec(open('generate-2fa/handler.py').read(), globals())
        req = MockReq(format_json_request(data))
        # Ajouter un contexte vide
        context = {}
        result = handle(req, context)
        
        print(f"🔄 Résultat brut: {result}")
        
        # Parser le résultat (peut être dict ou string JSON)
        if isinstance(result, dict):
            parsed = result
        elif isinstance(result, str) and result.startswith('{'):
            parsed = json.loads(result)
        else:
            return {"error": str(result)}, 400
            
        if "error" in parsed:
            if "not found" in parsed["error"]:
                return parsed, 404
            elif "already activated" in parsed["error"]:
                return parsed, 409
            else:
                return parsed, 400
        return parsed, 200
            
    except Exception as e:
        print(f"❌ Erreur generate-2fa: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/function/authenticate-user', methods=['POST'])
def authenticate_user():
    """Endpoint pour l'authentification"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        print(f"📝 authenticate-user appelé avec: {data}")
            
        # Simuler l'objet req d'OpenFaaS
        class MockReq:
            def __init__(self, body):
                self.body = body
        
        # Reload du handler pour authenticate-user
        exec(open('authenticate-user/handler.py').read(), globals())
        req = MockReq(format_json_request(data))
        # Ajouter un contexte vide
        context = {}
        result = handle(req, context)
        
        print(f"🔄 Résultat brut: {result}")
        
        # Parser le résultat et gérer les codes d'erreur
        try:
            # Parser le résultat (peut être dict ou string JSON)
            if isinstance(result, dict):
                parsed_result = result
            elif isinstance(result, str) and result.startswith('{'):
                parsed_result = json.loads(result)
            else:
                return {"error": str(result)}, 500
            
            # Gérer les codes d'erreur spécifiques
            if "error" in parsed_result:
                error_msg = parsed_result["error"]
                
                # Mappage des erreurs vers les codes HTTP appropriés
                if "Username and password required" in error_msg:
                    return parsed_result, 400
                elif "User not found" in error_msg:
                    return parsed_result, 401
                elif "Invalid password" in error_msg:
                    return parsed_result, 401
                elif "Invalid TOTP code" in error_msg:
                    return parsed_result, 401
                elif "expired" in error_msg:
                    return parsed_result, 403
                else:
                    return parsed_result, 400
            
            # Vérifier si 2FA est requis
            if "requires_2fa" in parsed_result and parsed_result["requires_2fa"]:
                return parsed_result, 400
            
            return parsed_result, 200
            
        except json.JSONDecodeError:
            return {"error": result}, 500
            
    except Exception as e:
        print(f"❌ Erreur authenticate-user: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/system/functions', methods=['GET'])
def list_functions():
    """Endpoint de status des fonctions (pour debug)"""
    return jsonify([
        {"name": "generate-password", "status": "ready"},
        {"name": "generate-2fa", "status": "ready"},
        {"name": "authenticate-user", "status": "ready"}
    ])

@app.route('/healthz', methods=['GET'])
def health():
    """Endpoint de santé"""
    return jsonify({"status": "ok", "message": "Mock OpenFaaS Server is running"})

if __name__ == '__main__':
    print("🚀 Démarrage du serveur Mock OpenFaaS pour MSPR COFRAP")
    print("📡 Endpoints disponibles :")
    print("   - POST http://localhost:8080/function/generate-password")
    print("   - POST http://localhost:8080/function/generate-2fa")
    print("   - POST http://localhost:8080/function/authenticate-user")
    print("   - GET  http://localhost:8080/system/functions")
    print("   - GET  http://localhost:8080/healthz")
    print("🌐 CORS activé pour le frontend React")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=8080, debug=True) 