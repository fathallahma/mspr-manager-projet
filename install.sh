#!/bin/bash

# Script d'installation automatique pour le projet MSPR COFRAP
# Auteur: Projet MSPR - EPSI
# Date: $(date)

set -e

echo "🚀 Installation du projet MSPR COFRAP"
echo "======================================"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérification des prérequis
print_status "Vérification des prérequis..."

# Vérifier PostgreSQL
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

print_success "Prérequis validés"

# Configuration de la base de données
print_status "Configuration de la base de données PostgreSQL..."

# Vérifier si PostgreSQL est en cours d'exécution
if ! sudo systemctl is-active --quiet postgresql; then
    print_warning "PostgreSQL n'est pas démarré. Tentative de démarrage..."
    sudo systemctl start postgresql
fi

# Créer la base de données
print_status "Création de la base de données mspr_db..."
sudo -u postgres psql -c "CREATE DATABASE mspr_db;" 2>/dev/null || print_warning "Base de données mspr_db existe déjà"

# Créer l'utilisateur
print_status "Création de l'utilisateur mspr_user..."
sudo -u postgres psql -c "CREATE USER mspr_user WITH PASSWORD 'mspr_password';" 2>/dev/null || print_warning "Utilisateur mspr_user existe déjà"

# Donner les permissions
print_status "Attribution des permissions..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mspr_db TO mspr_user;"

# Créer les tables
print_status "Création des tables..."
sudo -u postgres psql -d mspr_db -f database/init.sql

# Donner les permissions sur les tables
print_status "Attribution des permissions sur les tables..."
sudo -u postgres psql -d mspr_db -c "GRANT ALL PRIVILEGES ON TABLE users TO mspr_user; GRANT ALL PRIVILEGES ON SEQUENCE users_id_seq TO mspr_user;"

print_success "Base de données configurée avec succès"

# Configuration de l'environnement Python
print_status "Configuration de l'environnement Python..."

# Créer l'environnement virtuel
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_success "Environnement virtuel créé"
else
    print_warning "Environnement virtuel existe déjà"
fi

# Activer et installer les dépendances
source venv/bin/activate
pip install --quiet psycopg2-binary pyotp qrcode Pillow

print_success "Dépendances Python installées"

# Test des fonctions
print_status "Test des fonctions serverless..."
python3 simple_test.py

print_success "Tests réussis !"

# Affichage des informations finales
echo ""
echo "🎉 Installation terminée avec succès !"
echo "======================================"
echo ""
echo "📊 Informations de connexion:"
echo "  • Base de données: mspr_db"
echo "  • Utilisateur: mspr_user"
echo "  • Mot de passe: mspr_password"
echo "  • Host: localhost"
echo "  • Port: 5432"
echo ""
echo "🔧 Commandes utiles:"
echo "  • Activer l'environnement: source venv/bin/activate"
echo "  • Tester les fonctions: python3 simple_test.py"
echo "  • Consulter la DB: PGPASSWORD=mspr_password psql -h localhost -d mspr_db -U mspr_user"
echo ""
echo "📚 Documentation:"
echo "  • README.md - Guide d'utilisation complet"
echo "  • FUNCTIONS_README.md - Documentation des fonctions"
echo ""
echo "🚀 Déploiement OpenFaaS:"
echo "  • Construction: faas-cli build -f stack.yaml"
echo "  • Déploiement: faas-cli deploy -f stack.yaml"
echo ""
echo "✅ Le projet MSPR COFRAP est prêt à être utilisé !" 