# Guide de Configuration Frontend MSPR COFRAP

## 🔧 Configuration Rapide

### 1. Variables d'Environnement

Créez un fichier `.env.local` dans le répertoire `front/` :

```env
# Gateway OpenFaaS (obligatoire)
REACT_APP_OPENFAAS_GATEWAY=http://localhost:8080

# Port de développement (optionnel)
PORT=3000

# Environnement (optionnel)
REACT_APP_ENV=development
```

### 2. Configuration selon l'Environnement

#### Développement Local
```env
REACT_APP_OPENFAAS_GATEWAY=http://localhost:8080
```

#### Test avec k3d/minikube
```env
REACT_APP_OPENFAAS_GATEWAY=http://127.0.0.1:8081
```

#### Production
```env
REACT_APP_OPENFAAS_GATEWAY=https://openfaas.votre-domaine.com
```

## 🚀 Démarrage

### Installation
```bash
cd front
npm install
```

### Configuration de base
```bash
# Copier le fichier d'exemple
cp .env.example .env.local

# Modifier selon votre configuration
nano .env.local
```

### Démarrage de l'application
```bash
npm start
```

L'application sera accessible sur http://localhost:3000

## 🔗 Endpoints des Fonctions

Le frontend communique avec 3 fonctions OpenFaaS :

### 1. Génération de Mot de Passe
- **Endpoint** : `POST /function/generate-password`
- **Utilisé dans** : Composant `Signup.js`
- **Fonction** : Créer un utilisateur avec mot de passe sécurisé

### 2. Génération 2FA  
- **Endpoint** : `POST /function/generate-2fa`
- **Utilisé dans** : Composant `Signup.js`
- **Fonction** : Activer l'authentification 2FA

### 3. Authentification
- **Endpoint** : `POST /function/authenticate-user`
- **Utilisé dans** : Composant `Login.js`
- **Fonction** : Authentifier avec mot de passe + 2FA

## 🛠️ Personnalisation

### Modifier les Couleurs
Éditez les fichiers CSS dans `src/styles/` :

```css
/* Couleurs principales */
--primary-blue: #1D3557;
--primary-orange: #FF9F1C;
--success-green: #28a745;
--error-red: #dc3545;
```

### Adapter les Messages
Modifiez les textes dans les composants :
- `src/components/authentification/Login.js`
- `src/components/authentification/Signup.js`
- `src/components/pages/Home.js`

### Logo et Images
Remplacez les fichiers dans `src/assets/` :
- `logo.png`
- `back.jpg`
- `plant.png`
- `tablet.png`

## 🔒 Sécurité

### Configuration HTTPS
Pour la production, utilisez HTTPS :
```env
REACT_APP_OPENFAAS_GATEWAY=https://openfaas.votre-domaine.com
```

### CORS
Configurez CORS sur votre gateway OpenFaaS pour autoriser votre domaine frontend.

### Headers de Sécurité
Ajoutez des headers de sécurité à votre serveur web :
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
```

## 🧪 Tests

### Tests de Composants
```bash
npm test
```

### Build de Production
```bash
npm run build
```

### Validation des Endpoints
Testez manuellement les endpoints dans les outils de développement du navigateur.

## 🐛 Dépannage

### Problèmes Courants

#### Erreur CORS
```
Access to XMLHttpRequest at 'http://localhost:8080/function/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution** : Configurez CORS sur OpenFaaS ou utilisez un proxy de développement.

#### Gateway Inaccessible
```
TypeError: Failed to fetch
```

**Solutions** :
1. Vérifiez que OpenFaaS est démarré
2. Vérifiez l'URL du gateway dans `.env.local`
3. Testez l'endpoint avec curl :
   ```bash
   curl http://localhost:8080/function/generate-password
   ```

#### Fonctions Non Déployées
```
404 Not Found
```

**Solution** : Déployez les fonctions MSPR COFRAP :
```bash
faas-cli deploy -f stack.yaml
```

### Logs de Débogage

Activez les logs détaillés :
```bash
REACT_APP_DEBUG=true npm start
```

## 📱 Responsive Design

Le frontend est optimisé pour :
- ✅ Mobile (320px+)
- ✅ Tablette (768px+)  
- ✅ Desktop (1024px+)
- ✅ Large écrans (1440px+)

## 🚀 Déploiement

### Build de Production
```bash
npm run build
```

### Serveurs Recommandés
- **Nginx** : Pour servir les fichiers statiques
- **Apache** : Alternative à Nginx
- **Vercel** : Déploiement automatique
- **Netlify** : Déploiement avec CI/CD

### Configuration Nginx Exemple
```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    
    root /path/to/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📞 Support

### Vérifications de Base
1. ✅ OpenFaaS démarré et accessible
2. ✅ Fonctions MSPR déployées
3. ✅ Base de données PostgreSQL connectée
4. ✅ Variables d'environnement configurées
5. ✅ CORS configuré si nécessaire

### Tests Manuels
```bash
# Test du gateway
curl http://localhost:8080/system/functions

# Test des fonctions
curl -X POST http://localhost:8080/function/generate-password \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}'
```

---

## ✅ Checklist de Configuration

- [ ] Variables d'environnement configurées
- [ ] OpenFaaS accessible
- [ ] Fonctions MSPR déployées
- [ ] Base de données connectée
- [ ] npm install effectué
- [ ] npm start fonctionne
- [ ] Login/Signup testés
- [ ] 2FA testé avec Google Authenticator
- [ ] Tableau de bord accessible

Le frontend MSPR COFRAP est maintenant prêt à l'emploi ! 🎉 