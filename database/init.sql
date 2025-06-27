-- Script d'initialisation de la base de données MSPR
-- Création de la base de données et de la table users

-- Création de la base de données (exécuter séparément)
-- CREATE DATABASE mspr_db;

-- Se connecter à la base de données mspr_db après l'avoir créée
-- \c mspr_db;

-- Création de la table users selon les spécifications du cahier des charges
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,  -- Hash SHA-256 du mot de passe
    mfa VARCHAR(255),                -- Secret 2FA (base32)
    gendate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Date de création/dernière activité
    expired BOOLEAN DEFAULT FALSE   -- Statut d'expiration du compte
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_gendate ON users(gendate);
CREATE INDEX IF NOT EXISTS idx_users_expired ON users(expired);

-- Exemples de données de test (optionnel)
-- INSERT INTO users (username, password, mfa, gendate, expired) VALUES 
-- ('test_user', 'hashed_password_here', null, NOW(), false);

-- Affichage de la structure de la table
\d users; 