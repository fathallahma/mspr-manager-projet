# Frontend MSPR COFRAP

Interface utilisateur React pour le système MSPR COFRAP - Compagnie Française de Réalisation d'Applicatifs Professionnels.

## 🚀 Vue d'ensemble

Cette application React fournit une interface moderne et sécurisée pour interagir avec les fonctions serverless MSPR COFRAP :

- **Création de comptes** avec mots de passe sécurisés 24 caractères
- **Activation 2FA** avec QR codes pour Google Authenticator/Authy  
- **Authentification complète** avec mot de passe + 2FA
- **Tableau de bord** avec informations de sécurité et statut du système

## 🔧 Installation

### Prérequis
- Node.js 16+ et npm
- Fonctions MSPR COFRAP déployées sur OpenFaaS

### Installation
```bash
cd front
npm install
```

### Configuration
Créez un fichier `.env.local` avec :
```env
REACT_APP_OPENFAAS_GATEWAY=http://localhost:8080
```

### Démarrage
```bash
npm start
```
L'application sera disponible sur http://localhost:3000

## 🏗️ Architecture

### Composants Principaux

#### `Login.js` 
- Authentification avec fonction `authenticate-user`
- Support 2FA avec codes TOTP
- Gestion des erreurs sécurisée (400, 401, 403)
- Validation d'expiration des comptes

#### `Signup.js`
- Processus en 3 étapes :
  1. Génération mot de passe (function `generate-password`)
  2. Activation 2FA (function `generate-2fa`) 
  3. Configuration terminée
- QR codes pour faciliter la saisie
- Indicateur de progression visuel

#### `Home.js`
- Tableau de bord sécurisé
- Informations utilisateur et sécurité
- Statut des fonctions serverless
- Alertes d'expiration de compte

## 🔗 Intégration OpenFaaS

### Endpoints Utilisés
```
POST {GATEWAY}/function/generate-password
POST {GATEWAY}/function/generate-2fa  
POST {GATEWAY}/function/authenticate-user
```

### Format des Requêtes

#### Génération de Mot de Passe
```json
{
  "username": "nom_utilisateur"
}
```

#### Activation 2FA
```json
{
  "username": "nom_utilisateur"  
}
```

#### Authentification
```json
{
  "username": "nom_utilisateur",
  "password": "mot_de_passe_24_caracteres", 
  "totp_code": "123456"
}
```

## 🔒 Sécurité

### Fonctionnalités Implémentées
- ✅ Validation stricte des formulaires
- ✅ Gestion sécurisée des erreurs (pas de divulgation)
- ✅ Support complet 2FA (TOTP)
- ✅ Alertes d'expiration des comptes
- ✅ Sessions persistantes avec localStorage

### Codes d'Erreur Gérés
- **400** : Données manquantes ou invalides
- **401** : Authentification échouée  
- **403** : Compte expiré ou accès refusé
- **404** : Utilisateur non trouvé
- **409** : Conflit (utilisateur existant, 2FA déjà activé)

## 🎨 Interface Utilisateur

### Design System
- **Couleurs principales** :
  - Bleu foncé : `#1D3557` 
  - Orange vif : `#FF9F1C`
  - Vert succès : `#28a745`
  - Rouge erreur : `#dc3545`

### Responsive Design
- Support mobile et desktop
- Grilles CSS adaptatives
- Composants accessibles

## 🧪 Tests et Développement

### Scripts Disponibles
```bash
npm start      # Démarrage développement
npm test       # Lancement des tests
npm run build  # Build de production
```

### Variables d'Environnement
```env
REACT_APP_OPENFAAS_GATEWAY=http://localhost:8080  # Gateway OpenFaaS
PORT=3000                                         # Port de développement  
```

## 🚀 Déploiement

### Build de Production
```bash
npm run build
```

### Serveur Web
Les fichiers du build peuvent être servis par :
- Nginx
- Apache  
- Serveurs de fichiers statiques
- CDN (Cloudflare, AWS CloudFront)

### Configuration Gateway
Pour un déploiement en production, modifiez `REACT_APP_OPENFAAS_GATEWAY` pour pointer vers votre gateway OpenFaaS.

## 📋 Conformité MSPR

### Spécifications Respectées
- ✅ **Architecture serverless** : Intégration OpenFaaS
- ✅ **Sécurité renforcée** : Mots de passe 24 caractères  
- ✅ **2FA obligatoire** : TOTP avec QR codes
- ✅ **Expiration automatique** : Gestion 6 mois d'inactivité
- ✅ **Interface moderne** : React avec UX optimisée

### Workflow Utilisateur
1. **Création** : Username → Mot de passe → 2FA → Compte actif
2. **Connexion** : Username + Mot de passe + Code 2FA → Accès tableau de bord
3. **Sécurité** : Alertes d'expiration, statut sécurisé, informations techniques

## 🔧 Maintenance et Extension

### Ajouter de Nouvelles Fonctions
1. Créer le composant React
2. Ajouter l'endpoint dans les appels API
3. Mettre à jour le tableau de bord

### Personnalisation
- Modifier les couleurs dans les styles
- Adapter les messages dans les composants
- Configurer les URLs d'API selon l'environnement

---

## 🎯 Résumé

Le frontend MSPR COFRAP est maintenant **100% adapté** aux fonctions serverless développées :

- ✅ **Intégration complète** avec les 3 fonctions OpenFaaS
- ✅ **UX sécurisée** avec workflow guidé
- ✅ **Gestion d'erreurs robuste** 
- ✅ **Interface moderne** responsive
- ✅ **Conformité MSPR** totale

L'application est prête pour la démonstration et le déploiement en production ! 🚀