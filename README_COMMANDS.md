# 🚀 MSPR COFRAP SecureAuth - Guide d'Exécution

## 📋 Vue d'ensemble

Ce projet déploie un système d'authentification serverless avec :
- **3 fonctions OpenFaaS** : `generate-password`, `generate-2fa`, `authenticate-user`
- **Cluster Kubernetes K3d** avec OpenFaaS
- **Base de données PostgreSQL** locale
- **Frontend React** avec proxy Nginx
- **Tests automatisés** et validation d'accessibilité

---

## 🛠️ Prérequis

### Installation des outils requis

```bash
# Docker
sudo apt update && sudo apt install docker.io
sudo usermod -aG docker $USER
newgrp docker

# k3d
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# OpenFaaS CLI
curl -sL https://cli.openfaas.com | sudo sh

# Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt update && sudo apt install helm

# PostgreSQL (client + serveur)
sudo apt install postgresql postgresql-client

# Node.js & npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# jq (pour les tests)
sudo apt install jq
```

---

## 🗄️ Configuration de la Base de Données

### 1. Démarrer PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Créer la base de données

```bash
# Se connecter comme utilisateur postgres
sudo -u postgres psql

# Dans psql, exécuter :
CREATE DATABASE mspr_db;
CREATE USER mspr_user WITH PASSWORD 'mspr_password123';
GRANT ALL PRIVILEGES ON DATABASE mspr_db TO mspr_user;
\q
```

### 3. Initialiser le schéma

```bash
# Depuis le répertoire du projet
psql -h localhost -U mspr_user -d mspr_db -f database/init.sql
```

### 4. Variables d'environnement

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=mspr_db
export DB_USER=mspr_user
export DB_PASSWORD=mspr_password123
```

---

## ☸️ Déploiement Kubernetes + OpenFaaS

### 1. Créer le cluster k3d

```bash
# Nettoyer les clusters existants
k3d cluster delete demo 2>/dev/null || true

# Créer le nouveau cluster
k3d cluster create demo --wait

# Vérifier le cluster
kubectl get nodes
```

### 2. Configurer l'accès à la base externe

```bash
# Patcher CoreDNS pour résoudre host.k3d.internal
kubectl get configmap coredns -n kube-system -o yaml | \
sed 's/ready$/&\nhost.k3d.internal 172.17.0.1/' | \
kubectl apply -f -

# Redémarrer CoreDNS
kubectl -n kube-system rollout restart deploy/coredns
kubectl -n kube-system rollout status deploy/coredns --timeout=60s
```

### 3. Installer OpenFaaS

```bash
# Ajouter le repo Helm
helm repo add openfaas https://openfaas.github.io/faas-netes/
helm repo update

# Créer les namespaces
kubectl apply -f https://raw.githubusercontent.com/openfaas/faas-netes/master/namespaces.yml

# Installer OpenFaaS
helm upgrade --install openfaas openfaas/openfaas \
  --namespace openfaas \
  --set functionNamespace=openfaas-fn \
  --set generateBasicAuth=true \
  --set directFunctions=true

# Attendre le déploiement
kubectl wait --for=condition=available --timeout=300s deployment/gateway -n openfaas
```

### 4. Port-forward vers OpenFaaS

```bash
# Arrêter les port-forwards existants
pkill -f "kubectl port-forward.*8088" || true

# Démarrer le port-forward
kubectl port-forward -n openfaas svc/gateway 8088:8080 > kubectl_pf.log 2>&1 &

# Vérifier la connexion
sleep 5
curl -s -f http://127.0.0.1:8088/healthz
```

---

## 🔐 Déploiement des Secrets et Fonctions

### 1. Appliquer les Sealed Secrets

```bash
# Installer Sealed Secrets Controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Appliquer vos secrets chiffrés
kubectl apply -f sealed-db-creds.yaml
kubectl apply -f sealed-mfa-key.yaml

# Vérifier les secrets
kubectl get secrets -n openfaas-fn
```

### 2. Se connecter à OpenFaaS

```bash
# Récupérer le mot de passe admin
PASSWORD=$(kubectl get secret -n openfaas basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode)

# Se connecter
echo $PASSWORD | faas-cli login --username admin --password-stdin --gateway http://127.0.0.1:8088
```

### 3. Déployer les fonctions

```bash
# Déployer toutes les fonctions
faas-cli deploy -f stack.yaml --gateway http://127.0.0.1:8088

# Vérifier le déploiement
faas-cli list --gateway http://127.0.0.1:8088

# Attendre que toutes les fonctions soient prêtes
while [ $(faas-cli list --gateway http://127.0.0.1:8088 | grep -c "Ready") -lt 3 ]; do
  echo "Attente du déploiement des fonctions..."
  sleep 5
done
```

---

## 🌐 Démarrage du Proxy Nginx

```bash
# Arrêter le conteneur existant
docker stop nginx-cors-proxy 2>/dev/null || true
docker rm nginx-cors-proxy 2>/dev/null || true

# Démarrer le proxy CORS
docker run -d \
  --name nginx-cors-proxy \
  --network host \
  -v $(pwd)/nginx-cors-proxy.conf:/etc/nginx/nginx.conf:ro \
  nginx:alpine

# Vérifier le proxy
curl -s http://localhost:8089/healthz
```

---

## ⚛️ Démarrage du Frontend React

### 1. Installation des dépendances

```bash
cd front
npm install
```

### 2. Configuration de l'environnement

```bash
# Créer le fichier .env.local
echo "REACT_APP_OPENFAAS_GATEWAY=http://localhost:8089" > .env.local
```

### 3. Démarrer l'application

```bash
# Forcer le port 3001
export PORT=3001

# Démarrer React
npm start > ../react_server.log 2>&1 &

# Attendre que React soit prêt
sleep 10
curl -s http://localhost:3001
```

---

## 🧪 Tests et Validation

### 1. Tests de base de données

```bash
# Tester la connexion PostgreSQL
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM users;"
```

### 2. Tests des fonctions serverless

```bash
# Test generate-password
curl -X POST http://localhost:8089/function/generate-password \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user"}' | jq

# Test generate-2fa
curl -X POST http://localhost:8089/function/generate-2fa \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user"}' | jq

# Test authenticate-user
curl -X POST http://localhost:8089/function/authenticate-user \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "password": "your_generated_password"}' | jq
```

### 3. Tests d'accessibilité frontend

```bash
cd front

# Tests d'accessibilité
npm test -- --testMatch="**/*.a11y.test.js" --watchAll=false

# Tests unitaires
npm test -- --watchAll=false

# Tests de couverture
npm test -- --coverage --watchAll=false
```

### 4. Tests d'intégration complets

```bash
# Depuis la racine du projet
python3 test_scenarios.py
python3 test_complete_scenarios.py
```

---

## 📊 Monitoring et Logs

### 1. Vérifier l'état du cluster

```bash
# Pods OpenFaaS
kubectl get pods -n openfaas

# Fonctions déployées
kubectl get pods -n openfaas-fn

# Services
kubectl get svc -n openfaas
```

### 2. Consulter les logs

```bash
# Logs des fonctions
kubectl logs -f deployment/generate-password -n openfaas-fn
kubectl logs -f deployment/generate-2fa -n openfaas-fn
kubectl logs -f deployment/authenticate-user -n openfaas-fn

# Logs du gateway OpenFaaS
kubectl logs -f deployment/gateway -n openfaas

# Logs du proxy Nginx
docker logs -f nginx-cors-proxy

# Logs du frontend React
tail -f react_server.log
```

### 3. Métriques Prometheus

```bash
# Port-forward vers Prometheus
kubectl port-forward -n openfaas svc/prometheus 9090:9090 &

# Ouvrir dans le navigateur
xdg-open http://localhost:9090
```

---

## 🚀 Script de Démarrage Automatique

### Utiliser le script fourni

```bash
# Rendre le script exécutable
chmod +x start_full_demo.sh

# Lancer la démo complète
./start_full_demo.sh
```

Ce script automatise toutes les étapes ci-dessus.

---

## 🧹 Arrêt et Nettoyage

### 1. Arrêter les services

```bash
# Arrêter React
pkill -f "npm start" || true

# Arrêter le proxy Nginx
docker stop nginx-cors-proxy
docker rm nginx-cors-proxy

# Arrêter les port-forwards
pkill -f "kubectl port-forward" || true
```

### 2. Nettoyer le cluster

```bash
# Supprimer le cluster k3d
k3d cluster delete demo

# Nettoyer les images Docker (optionnel)
docker system prune -f
```

### 3. Arrêter PostgreSQL (optionnel)

```bash
sudo systemctl stop postgresql
```

---

## 🌍 URLs d'Accès

Une fois tout démarré, voici les URLs importantes :

- **Frontend React** : http://localhost:3001
- **Proxy Nginx** : http://localhost:8089
- **OpenFaaS Gateway** : http://localhost:8088
- **Prometheus** : http://localhost:9090 (après port-forward)

---

## 🔧 Dépannage

### Problèmes courants

1. **Port déjà utilisé** :
   ```bash
   sudo lsof -i :3001  # Vérifier qui utilise le port
   pkill -f "port_process"  # Tuer le processus
   ```

2. **Cluster k3d ne démarre pas** :
   ```bash
   k3d cluster delete demo
   docker system prune -f
   k3d cluster create demo --wait
   ```

3. **Base de données inaccessible** :
   ```bash
   sudo systemctl status postgresql
   sudo systemctl restart postgresql
   ```

4. **Fonctions non déployées** :
   ```bash
   faas-cli remove -f stack.yaml
   faas-cli deploy -f stack.yaml
   ```

---

## 📚 Documentation Technique

- **Architecture** : voir `ARCHITECTURE_EXPLAINED.md`
- **Fonctions** : voir `FUNCTIONS_README.md`  
- **Tests** : voir `TESTS_DOCUMENTATION.md`
- **Frontend** : voir `front/README.md`

---

## 🎯 Validation Finale

Pour vérifier que tout fonctionne :

1. ✅ Frontend accessible sur http://localhost:3001
2. ✅ Création d'un compte via l'interface
3. ✅ Génération de mot de passe + QR code
4. ✅ Activation 2FA + QR code TOTP
5. ✅ Connexion avec mot de passe + code 2FA
6. ✅ Tests d'accessibilité passent
7. ✅ Métriques Prometheus disponibles

**🎉 Si toutes ces étapes passent, votre démo MSPR est prête !** 