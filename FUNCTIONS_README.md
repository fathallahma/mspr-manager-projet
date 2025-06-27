# Documentation des Fonctions Serverless MSPR

Ce document décrit les 3 fonctions serverless OpenFaaS développées pour le projet COFRAP selon les spécifications du cahier des charges.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  generate-      │    │   generate-2fa   │    │ authenticate-   │
│  password       │    │                  │    │ user            │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │  PostgreSQL DB      │
                    │                     │
                    │  Table: users       │
                    │  - id               │
                    │  - username         │
                    │  - password (hash)  │
                    │  - mfa (secret)     │
                    │  - gendate          │
                    │  - expired          │
                    └─────────────────────┘
```

## 1. Function: generate-password

### Description
Génère un mot de passe sécurisé de 24 caractères et crée un nouvel utilisateur dans la base de données.

### Endpoint
```
POST /function/generate-password
```

### Input
```json
{
    "username": "nom_utilisateur"
}
```

### Output
```json
{
    "statusCode": 200,
    "body": {
        "success": true,
        "user_id": 1,
        "username": "nom_utilisateur",
        "password": "motdepasse_genere_24_chars",
        "message": "Password generated successfully for user 'nom_utilisateur'",
        "gendate": "2024-01-15T10:30:00.000Z",
        "qrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEU..."
    }
}
```

### Fonctionnalités
- ✅ Génération de mots de passe de 24 caractères
- ✅ Inclusion de majuscules, minuscules, chiffres et caractères spéciaux
- ✅ Hashage SHA-512 (rétro-compatibilité SHA-256) pour le stockage en base
- ✅ Vérification de l'unicité du nom d'utilisateur
- ✅ Génération d'un QR code du mot de passe
- ✅ Enregistrement en base de données avec timestamp

### Codes d'erreur
- `400`: Username requis
- `409`: Utilisateur déjà existant
- `500`: Erreur base de données

## 2. Function: generate-2fa

### Description
Génère un secret 2FA et un QR code TOTP pour un utilisateur existant.

### Endpoint
```
POST /function/generate-2fa
```

### Input
```json
{
    "username": "nom_utilisateur"
}
```

### Output
```json
{
    "statusCode": 200,
    "body": {
        "success": true,
        "username": "nom_utilisateur",
        "mfa_secret": "JBSWY3DPEHPK3PXP",
        "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEU...",
        "totp_uri": "otpauth://totp/COFRAP:nom_utilisateur?secret=JBSWY3DPEHPK3PXP&issuer=COFRAP",
        "message": "2FA secret generated successfully for user 'nom_utilisateur'",
        "instructions": "Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)"
    }
}
```

### Fonctionnalités
- ✅ Génération de secret 2FA (base32)
- ✅ Création de QR code TOTP compatible
- ✅ Support des applications comme Google Authenticator, Authy
- ✅ Vérification de l'existence de l'utilisateur
- ✅ Prévention de la double activation 2FA
- ✅ URI TOTP standard (otpauth://)

### Codes d'erreur
- `400`: Username requis
- `404`: Utilisateur non trouvé
- `409`: 2FA déjà activé pour cet utilisateur
- `500`: Erreur base de données

## 3. Function: authenticate-user

### Description
Authentifie un utilisateur avec mot de passe et validation 2FA optionnelle. Gère l'expiration des comptes après 6 mois d'inactivité.

### Endpoint
```
POST /function/authenticate-user
```

### Input
```json
{
    "username": "nom_utilisateur",
    "password": "motdepasse",
    "totp_code": "123456"
}
```

### Output (Succès)
```json
{
    "statusCode": 200,
    "body": {
        "success": true,
        "username": "nom_utilisateur",
        "user_id": 1,
        "message": "Authentication successful",
        "has_2fa": true,
        "gendate": "2024-01-15T10:30:00.000Z"
    }
}
```

### Output (2FA requis)
```json
{
    "statusCode": 400,
    "body": {
        "error": "2FA code is required",
        "success": false,
        "requires_2fa": true
    }
}
```

### Output (Compte expiré)
```json
{
    "statusCode": 403,
    "body": {
        "error": "Account has expired due to inactivity (6 months)",
        "success": false,
        "expired": true,
        "message": "Please contact administrator to reactivate your account"
    }
}
```

### Fonctionnalités
- ✅ Authentification par mot de passe (hash SHA-512 ou SHA-256 hérité)
- ✅ Validation 2FA TOTP avec fenêtre de tolérance (secret déchiffré en mémoire)
- ✅ Gestion automatique de l'expiration (6 mois)
- ✅ Mise à jour de `gendate` à chaque authentification réussie
- ✅ Marquage automatique des comptes expirés
- ✅ Réponses sécurisées (pas de divulgation d'information)

### Codes d'erreur
- `400`: Username/password requis ou 2FA requis
- `401`: Identifiants invalides ou code 2FA incorrect
- `403`: Compte expiré
- `500`: Erreur base de données

## Sécurité Implémentée

### Mots de passe
- **Longueur**: 24 caractères minimum
- **Complexité**: Majuscules + minuscules + chiffres + caractères spéciaux
- **Stockage**: Hash SHA-512 (avec prise en charge SHA-256 existant)
- **Génération**: Utilisation de `secrets` pour la cryptographie sécurisée

### 2FA
- **Standard**: TOTP (RFC 6238)
- **Compatibilité**: Google Authenticator, Authy, etc.
- **Fenêtre**: Tolérance de 30 secondes pour compensation de dérive
- **Secret**: Base32 généré cryptographiquement
- **Chiffrement at-rest** : secret TOTP chiffré AES-256-GCM (clé `MFA_KEY_B64`)

### Gestion des comptes
- **Expiration**: Automatique après 6 mois d'inactivité
- **Activité**: Mise à jour à chaque authentification réussie
- **Sécurité**: Pas de divulgation d'informations sur l'existence des comptes

## Installation et Déploiement

### Prérequis
```bash
# PostgreSQL
# OpenFaaS déployé sur Kubernetes
# Python 3.8+
```

### Base de données
```bash
psql -U postgres < database/init.sql
```

### Déploiement OpenFaaS
```bash
faas-cli build -f stack.yaml
faas-cli deploy -f stack.yaml
```

### Variables d'environnement
```yaml
environment:
  DB_HOST: "postgres"
  DB_NAME: "mspr_db"
  DB_USER: "postgres"
  DB_PASSWORD: "password"
  DB_PORT: "5432"
```

## Tests

### Test generate-password
```bash
curl -X POST http://localhost:8080/function/generate-password \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}'
```

### Test generate-2fa
```bash
curl -X POST http://localhost:8080/function/generate-2fa \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}'
```

### Test authenticate-user
```bash
curl -X POST http://localhost:8080/function/authenticate-user \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "motdepasse_genere", "totp_code": "123456"}'
```

## Workflow Complet

1. **Création d'utilisateur**: `generate-password` → Nouveau compte avec mot de passe
2. **Activation 2FA**: `generate-2fa` → QR code pour application d'authentification
3. **Connexion**: `authenticate-user` → Validation mot de passe + 2FA

Cette implémentation respecte entièrement les exigences du cahier des charges COFRAP et assure une sécurité robuste avec l'authentification à deux facteurs et la gestion automatique de l'expiration des comptes.

## Validation des performances

Un test de charge de 60 s avec 40 clients concurrents a atteint :

* **244 requêtes/s** (≥ 20 req/s requis)
* **p95 : 206 ms** (< 500 ms requis)

La plateforme satisfait donc le critère de performance du cahier des charges. 