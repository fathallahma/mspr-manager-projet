#!/bin/bash

echo "🚀 DÉMARRAGE COMPLET - DÉMO MSPR COFRAP"
echo "======================================="
echo "Infrastructure: k3d + OpenFaaS + React + PostgreSQL"
echo ""

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "🛑 Arrêt de la démo..."
    
    # Arrêter tous les processus en arrière-plan
    if [ ! -z "$KUBECTL_PID" ]; then
        [ -n "$KUBECTL_PID" ] && kill $KUBECTL_PID 2>/dev/null
        echo "   ✅ Port-forward kubectl arrêté"
    fi
    
    # Arrêter le conteneur nginx
    if docker ps | grep -q "nginx-cors-proxy"; then
        docker stop nginx-cors-proxy 2>/dev/null
        docker rm nginx-cors-proxy 2>/dev/null
        echo "   ✅ Conteneur Nginx arrêté"
    fi
    
    if [ ! -z "$REACT_PID" ]; then
        kill $REACT_PID 2>/dev/null
        echo "   ✅ Frontend React arrêté"
    fi
    
    # Arrêter tous les processus liés
    pkill -f "kubectl port-forward" 2>/dev/null
    pkill -f "npm start" 2>/dev/null
    
    echo "🎯 Démo arrêtée proprement"
    exit 0
}

# Capturer les signaux d'arrêt
trap cleanup SIGINT SIGTERM

# Configuration de la base de données locale
export DB_HOST=localhost
export DB_NAME=mspr_db
export DB_USER=mspr_user
export DB_PASSWORD=mspr_password
export DB_PORT=5432

echo "🔧 Configuration de la base de données :"
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Port: $DB_PORT"
echo ""

# Vérifier que la base de données est accessible
echo "🔌 Test de connexion à la base de données..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Base de données PostgreSQL accessible"
else
    echo "   ❌ Problème de connexion à la base de données"
    echo "   Vérifiez que PostgreSQL est démarré et que la base mspr_db existe"
    echo "   Commandes pour créer la DB:"
    echo "   sudo -u postgres psql -c \"CREATE DATABASE mspr_db;\""
    echo "   sudo -u postgres psql -c \"CREATE USER mspr_user WITH PASSWORD 'mspr_password';\""
    echo "   sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE mspr_db TO mspr_user;\""
    exit 1
fi
echo ""

# Vérifier les prérequis
echo "🔍 Vérification des prérequis..."

# Docker
if ! command -v docker &> /dev/null; then
    echo "   ❌ Docker n'est pas installé"
    exit 1
else
    echo "   ✅ Docker disponible"
fi

# k3d
if ! command -v k3d &> /dev/null; then
    echo "   ❌ k3d n'est pas installé"
    echo "   Installation: curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash"
    exit 1
else
    echo "   ✅ k3d disponible"
fi

# kubectl
if ! command -v kubectl &> /dev/null; then
    echo "   ❌ kubectl n'est pas installé"
    exit 1
else
    echo "   ✅ kubectl disponible"
fi

# faas-cli
if ! command -v faas-cli &> /dev/null; then
    echo "   ❌ faas-cli n'est pas installé"
    echo "   Installation: curl -sL https://cli.openfaas.com | sudo sh"
    exit 1
else
    echo "   ✅ faas-cli disponible"
fi

# nginx
if ! command -v docker &> /dev/null; then
    echo "   ❌ Docker n'est pas disponible pour nginx"
    exit 1
else
    echo "   ✅ nginx via Docker disponible"
fi
echo ""

# Arrêter les processus existants
echo "🧹 Nettoyage des processus existants..."
pkill -f "kubectl port-forward" 2>/dev/null
docker stop nginx-cors-proxy 2>/dev/null
docker rm nginx-cors-proxy 2>/dev/null
pkill -f "npm start" 2>/dev/null
sleep 2
echo "   ✅ Processus nettoyés"
echo ""

# Démarrer/vérifier le cluster k3d
echo "🐳 Gestion du cluster k3d 'demo'..."

# Vérifier si le cluster existe. Le créer s'il n'existe pas.
if ! k3d cluster list | grep -q "^demo "; then
    echo "   🚀 Création du cluster k3d 'demo'..."
    k3d cluster create demo --wait
    if [ $? -ne 0 ]; then
        echo "   ❌ Erreur lors de la création du cluster"
        exit 1
    fi
    echo "   ✅ Cluster k3d 'demo' créé avec succès"
else
    echo "   ✅ Cluster k3d 'demo' déjà existant"
fi

# S'assurer que le cluster est démarré.
if k3d cluster list | grep -iE -q "^demo.*(running|started)"; then
    echo "   ✅ Cluster k3d 'demo' est déjà en cours d'exécution"
else
    echo "   🚀 Démarrage du cluster k3d 'demo'..."
    k3d cluster start demo --wait
    if [ $? -ne 0 ]; then
        echo "   ❌ Le cluster k3d 'demo' n'a pas pu être démarré"
        exit 1
    fi
fi

# -------------------------------------------------------------
# Vérifier/patcher l'entrée DNS "host.k3d.internal" (accès DB)
# -------------------------------------------------------------

echo "🌐 Vérification de l'alias DNS host.k3d.internal dans CoreDNS..."
# Récupérer l'adresse passerelle du réseau Docker associé au cluster
HOST_GATEWAY_IP=$(docker network inspect k3d-demo -f '{{ (index .IPAM.Config 0).Gateway }}')

# Si l'entrée n'existe pas encore, on l'ajoute et on redémarre CoreDNS
if ! kubectl -n kube-system get configmap coredns -o yaml | grep -q "host.k3d.internal"; then
    echo "   ➕ Ajout de host.k3d.internal -> $HOST_GATEWAY_IP dans CoreDNS"
    kubectl -n kube-system patch configmap coredns --type merge -p "{\"data\":{\"NodeHosts\":\"$HOST_GATEWAY_IP host.k3d.internal host.docker.internal\"}}"
    kubectl -n kube-system rollout restart deploy/coredns
    kubectl -n kube-system rollout status deploy/coredns --timeout=60s
    echo "   ✅ CoreDNS patché avec succès"
else
    echo "   ✅ Alias déjà présent"
fi
echo ""

# Vérifier et installer OpenFaaS si nécessaire
echo "🔧 Vérification/Installation d'OpenFaaS..."
if ! kubectl get deployment/gateway -n openfaas > /dev/null 2>&1; then
    echo "   🚀 OpenFaaS non trouvé. Installation via Helm..."
    
    kubectl create namespace openfaas
    kubectl create namespace openfaas-fn
    
    helm repo add openfaas https://openfaas.github.io/faas-netes/
    helm repo update
    
    # Installer OpenFaaS
    helm upgrade openfaas openfaas/openfaas \
      --install \
      --namespace openfaas \
      --set functionNamespace=openfaas-fn \
      --set generateBasicAuth=true \
      --set gateway.directFunctions=true  # Important pour CORS en dev
    
    echo "   ⏳ Attente du démarrage complet des pods OpenFaaS..."
    kubectl wait --for=condition=available --timeout=300s deployment/gateway -n openfaas
    if [ $? -ne 0 ]; then
        echo "   ❌ Le gateway OpenFaaS n'a pas pu démarrer."
        exit 1
    fi
    echo "   ✅ OpenFaaS installé et démarré avec succès."
else
    echo "   ✅ OpenFaaS déjà installé."
fi
echo ""

# Démarrer le port-forward en arrière-plan (nécessaire car le cluster n'expose plus 8088)
echo "🌐 Démarrage du port-forward kubectl (8088 → OpenFaaS)..."
pkill -f "kubectl port-forward.*8088" 2>/dev/null || true
kubectl port-forward -n openfaas svc/gateway 8088:8080 > kubectl_pf.log 2>&1 &
KUBECTL_PID=$!
echo "   ✅ Port-forward démarré (PID=$KUBECTL_PID)"

# Boucle de test pour le gateway
echo "🧪 Test de la connexion au gateway OpenFaaS (jusqu'à 60s)..."
for i in {1..12}; do
    # On teste le healthz qui doit répondre avec un 200
    if curl -s -f http://127.0.0.1:8088/healthz > /dev/null 2>&1; then
        echo "   ✅ OpenFaaS Gateway est prêt et accessible sur le port 8088 !"
        GATEWAY_READY=true
        break
    fi
    echo "   ... en attente du gateway (essai $i/12)"
    sleep 5
done

if [ "$GATEWAY_READY" != "true" ]; then
    echo "   ❌ Impossible de se connecter au gateway OpenFaaS après 60 secondes."
    echo "   Logs du port-forward :"
    cat kubectl_pf.log
    [ -n "$KUBECTL_PID" ] && kill $KUBECTL_PID 2>/dev/null
    exit 1
fi
echo ""

# Authentification et déploiement
echo "🔐 Authentification et déploiement des fonctions..."
if [ -f "stack.yaml" ]; then
    echo "   🔑 Récupération du mot de passe admin..."
    PASSWORD=$(kubectl get secret -n openfaas basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode)
    
    echo "   👤 Connexion à faas-cli..."
    echo $PASSWORD | faas-cli login --username admin --password-stdin --gateway http://127.0.0.1:8088
    
    echo "   🐳 Connexion à Docker Hub (si nécessaire)..."
    docker login
    
    echo "   🔨 Build des images Docker..."
    faas-cli build -f stack.yaml
    
    echo "   🚀 Pousser les images sur Docker Hub..."
    faas-cli push -f stack.yaml
    
    echo "   🛰️  Déploiement des fonctions depuis Docker Hub..."
    faas-cli deploy -f stack.yaml --gateway http://127.0.0.1:8088
    
    echo "   ⏳ Attente de la disponibilité des fonctions (jusqu'à 90s)..."
    for i in {1..18}; do
        ready_count=$(faas-cli list --gateway http://127.0.0.1:8088 | wc -l)
        # On attend 4 lignes : 1 pour l'en-tête + 3 pour les fonctions
        if [ "$ready_count" -ge 4 ]; then
            echo "   ✅ Les 3 fonctions sont prêtes !"
            FUNCTIONS_READY=true
            break
        fi
        echo "   ... en attente des fonctions ($((ready_count - 1))/3 prêtes)"
        sleep 5
    done
    
    if [ "$FUNCTIONS_READY" != "true" ]; then
        echo "   ❌ Les fonctions n'ont pas pu être déployées correctement après 90 secondes."
        echo "   État actuel des fonctions :"
        faas-cli list --gateway http://127.0.0.1:8088
        exit 1
    fi
else
    echo "   ⚠️  Fichier stack.yaml non trouvé."
fi
echo ""

# Démarrer le proxy CORS Nginx
echo "🔗 Démarrage du proxy CORS Nginx (8089)..."
if [ -f "nginx-cors-proxy.conf" ]; then
    # Démarrer nginx dans un conteneur Docker
    docker run -d \
        --name nginx-cors-proxy \
        --network host \
        -v $(pwd)/nginx-cors-proxy.conf:/etc/nginx/nginx.conf:ro \
        nginx:alpine > nginx_proxy.log 2>&1
    
    # Attendre que Nginx soit prêt
    sleep 5
    
    # Tester le proxy CORS
    echo "🧪 Test du proxy CORS..."
    curl -s http://localhost:8089/healthz > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Proxy CORS Nginx (Docker) opérationnel sur port 8089"
    else
        echo "   ❌ Erreur du proxy CORS"
        docker stop nginx-cors-proxy 2>/dev/null
        docker rm nginx-cors-proxy 2>/dev/null
        [ -n "$KUBECTL_PID" ] && kill $KUBECTL_PID 2>/dev/null
        exit 1
    fi
else
    echo "   ❌ Fichier nginx-cors-proxy.conf non trouvé"
    [ -n "$KUBECTL_PID" ] && kill $KUBECTL_PID 2>/dev/null
    exit 1
fi
echo ""

# Démarrer le frontend React
echo "⚛️  Démarrage du frontend React (port 3001)..."
if [ -d "front" ]; then
    cd front
    
    # Vérifier package.json et node_modules
    if [ ! -f "package.json" ]; then
        echo "   ❌ package.json non trouvé dans le dossier front"
        cd ..
        cleanup
        exit 1
    fi
    
    if [ ! -d "node_modules" ]; then
        echo "   📦 Installation des dépendances Node.js..."
        npm install
    fi
    
    # Configurer les variables d'environnement
    export REACT_APP_OPENFAAS_GATEWAY=http://localhost:8089
    export PORT=3001  # Forcer React à démarrer sur le port 3001
    
    npm start > ../react_server.log 2>&1 &
    REACT_PID=$!
    cd ..
    
    # Attendre que React soit prêt
    echo "   ⏳ Attente du démarrage de React..."
    sleep 15
    
    # Tester le frontend React
    echo "🧪 Test du frontend React..."
    curl -s http://localhost:3001 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Frontend React opérationnel sur port 3001"
    else
        echo "   ⚠️  Frontend React en cours de démarrage..."
    fi
else
    echo "   ❌ Dossier 'front' non trouvé"
    cleanup
    exit 1
fi
echo ""

# Tests des fonctions OpenFaaS
echo "🧪 TESTS DES FONCTIONS OPENFAAS"
echo "==============================="

# Test 1: Génération de mot de passe
echo "📝 Test 1: Génération de mot de passe..."
USERNAME="test_demo_$(date +%s)"
RESPONSE=$(curl -s -X POST http://localhost:8089/function/generate-password \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$USERNAME\"}")

if echo $RESPONSE | grep -q "success.*true"; then
    echo "   ✅ Génération de mot de passe: OK"
    PASSWORD=$(echo $RESPONSE | jq -r '.password' 2>/dev/null)
else
    echo "   ❌ Génération de mot de passe: ÉCHEC"
    echo "   Réponse: $RESPONSE"
fi

# Test 2: Génération 2FA
if [ ! -z "$USERNAME" ] && [ ! -z "$PASSWORD" ]; then
    echo "📱 Test 2: Génération 2FA pour $USERNAME..."
    RESPONSE_2FA=$(curl -s -X POST http://localhost:8089/function/generate-2fa \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$USERNAME\"}")
    
    if echo $RESPONSE_2FA | grep -q "success.*true"; then
        echo "   ✅ Génération 2FA: OK"
        MFA_SECRET=$(echo $RESPONSE_2FA | jq -r '.mfa_secret' 2>/dev/null)
    else
        echo "   ❌ Génération 2FA: ÉCHEC"
        echo "   Réponse: $RESPONSE_2FA"
    fi
fi

# Test 3: Test d'authentification (sans code 2FA pour la démo)
if [ ! -z "$USERNAME" ] && [ ! -z "$PASSWORD" ]; then
    echo "🔐 Test 3: Test d'authentification (sans 2FA)..."
    RESPONSE_AUTH=$(curl -s -X POST http://localhost:8089/function/authenticate-user \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")
    
    if echo $RESPONSE_AUTH | grep -q "success.*true"; then
        echo "   ✅ Authentification: OK"
    else
        echo "   ⚠️  Authentification: Nécessite code 2FA (normal)"
    fi
fi

echo ""
echo "🎉 DÉMO MSPR COFRAP OPÉRATIONNELLE !"
echo "==================================="
echo ""
echo "🌐 ACCÈS AUX SERVICES :"
echo "   Frontend React    : http://localhost:3001"
echo "   Proxy CORS        : http://localhost:8089"
echo "   OpenFaaS Gateway  : http://127.0.0.1:8088"
echo "   Cluster k3d       : demo"
echo ""
echo "📋 ENDPOINTS DISPONIBLES :"
echo "   POST http://localhost:8089/function/generate-password"
echo "   POST http://localhost:8089/function/generate-2fa"
echo "   POST http://localhost:8089/function/authenticate-user"
echo "   GET  http://localhost:8089/healthz"
echo ""
echo "🧪 COMPTE DE TEST CRÉÉ :"
echo "   Username: $USERNAME"
echo "   Password: $PASSWORD"
if [ ! -z "$MFA_SECRET" ]; then
    echo "   MFA Secret: $MFA_SECRET"
fi
echo ""
echo "📖 COMMENT TESTER :"
echo "   1. Ouvrez votre navigateur sur http://localhost:3001"
echo "   2. Utilisez 'Créer un compte' pour créer un nouvel utilisateur"
echo "   3. Activez la 2FA et scannez le QR code"
echo "   4. Testez la connexion avec vos identifiants + code 2FA"
echo ""
echo "📊 LOGS EN TEMPS RÉEL :"
echo "   OpenFaaS         : kubectl logs -n openfaas-fn deployment/generate-password"
echo "   Port-forward     : tail -f kubectl_pf.log"
echo "   Proxy CORS       : docker logs nginx-cors-proxy"
echo "   Frontend React   : tail -f react_server.log"
echo ""
echo "🔧 COMMANDES UTILES :"
echo "   Voir les fonctions : faas-cli list"
echo "   Logs Kubernetes   : kubectl get pods -n openfaas-fn"
echo "   Restart cluster   : k3d cluster stop demo && k3d cluster start demo"
echo "   Restart nginx     : docker restart nginx-cors-proxy"
echo "   Status conteneurs : docker ps"
echo ""
echo "🛑 Pour arrêter la démo, utilisez Ctrl+C"
echo ""

# Attendre indéfiniment (jusqu'à Ctrl+C)
while true; do
    sleep 10
    
    # Vérifier que les services sont toujours actifs
    if [ -n "$KUBECTL_PID" ] && ! kill -0 $KUBECTL_PID 2>/dev/null; then
        echo "⚠️  Le port-forward kubectl s'est arrêté"
        break
    fi
    
    # Vérifier que le conteneur nginx est toujours actif
    if ! docker ps | grep -q "nginx-cors-proxy"; then
        echo "⚠️  Le conteneur Nginx s'est arrêté"
        break
    fi
    
    # Vérifier que le frontend React répond toujours
    if ! curl -s -f http://localhost:3001 > /dev/null 2>&1; then
        echo "⚠️  Le frontend React ne répond plus"
        break
    fi
done

# Nettoyage final
cleanup 