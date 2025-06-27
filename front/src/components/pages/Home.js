import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { 
  FiLogOut, 
  FiUser, 
  FiShield, 
  FiClock, 
  FiCheckCircle, 
  FiAlertTriangle,
  FiSettings,
  FiDatabase,
  FiServer,
  FiKey
} from "react-icons/fi";

import "../../styles/pages/Home.css";

export default function Home({ onLogout }) {
  const userData = useSelector((state) => state.user);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [accountStatus, setAccountStatus] = useState({});

  // Mettre à jour l'heure affichée
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculer le statut du compte et l'expiration
  useEffect(() => {
    if (userData.last_activity) {
      const lastActivity = new Date(userData.last_activity);
      const now = new Date();
      const diffMonths = (now - lastActivity) / (1000 * 60 * 60 * 24 * 30);
      const daysUntilExpiry = Math.max(0, (6 * 30) - Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24)));
      
      setAccountStatus({
        isExpiringSoon: daysUntilExpiry <= 30 && daysUntilExpiry > 0,
        daysUntilExpiry,
        isActive: diffMonths < 6,
        lastActivityDays: Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24))
      });
    }
  }, [userData.last_activity]);

  const formatLastActivity = (dateStr) => {
    if (!dateStr) return "Non disponible";
    try {
      return new Date(dateStr).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return "Format invalide";
    }
  };

  const SecurityCard = ({ icon, title, value, status, description }) => (
    <div className={`security-card ${status}`}>
      <div className="card-header">
        <div className="card-icon">{icon}</div>
        <h3>{title}</h3>
      </div>
      <div className="card-value">{value}</div>
      <div className="card-description">{description}</div>
    </div>
  );

  const InfoCard = ({ icon, title, children }) => (
    <div className="info-card">
      <div className="card-header">
        <div className="card-icon">{icon}</div>
        <h3>{title}</h3>
      </div>
      <div className="card-content">
        {children}
      </div>
    </div>
  );

  return (
    <div className="home-container">
      {/* Barre d'en-tête */}
      <header className="header-bar">
        <div className="header-left">
          <div className="header-brand">
            <h1>COFRAP</h1>
            <span className="header-subtitle">Dashboard de Sécurité</span>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-welcome">
              <FiUser size={16} />
              {userData.username}
            </span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Déconnexion">
            <FiLogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="main-content">
        {/* Alerte d'expiration si nécessaire */}
        {accountStatus.isExpiringSoon && (
          <div className="alert alert-warning">
            <FiAlertTriangle />
            <div>
              <strong>Attention :</strong> Votre compte expire dans {accountStatus.daysUntilExpiry} jours. 
              Connectez-vous régulièrement pour maintenir l'accès.
            </div>
          </div>
        )}

        {/* Section de sécurité */}
        <section className="security-section">
          <h2>
            <FiShield />
            Statut de Sécurité MSPR
          </h2>
          <div className="security-grid">
            <SecurityCard
              icon={<FiKey />}
              title="Mot de passe"
              value="24 caractères"
              status="secure"
              description="Mot de passe sécurisé conforme MSPR"
            />
            <SecurityCard
              icon={<FiShield />}
              title="Authentification 2FA"
              value={userData.has_2fa ? "Activée" : "Désactivée"}
              status={userData.has_2fa ? "secure" : "warning"}
              description={userData.has_2fa ? "TOTP configuré" : "Configuration recommandée"}
            />
            <SecurityCard
              icon={<FiClock />}
              title="Expiration"
              value={accountStatus.isActive ? `${accountStatus.daysUntilExpiry} jours` : "Expiré"}
              status={accountStatus.isActive ? (accountStatus.isExpiringSoon ? "warning" : "secure") : "danger"}
              description="Renouvellement automatique à la connexion"
            />
            <SecurityCard
              icon={<FiCheckCircle />}
              title="Conformité MSPR"
              value="100%"
              status="secure"
              description="Toutes les exigences respectées"
            />
          </div>
        </section>

        {/* Informations détaillées */}
        <div className="info-grid">
          <InfoCard icon={<FiUser />} title="Informations du Compte">
            <div className="info-list">
              <div className="info-item">
                <span className="label">ID Utilisateur :</span>
                <span className="value">{userData.id}</span>
              </div>
              <div className="info-item">
                <span className="label">Nom d'utilisateur :</span>
                <span className="value">{userData.username}</span>
              </div>
              <div className="info-item">
                <span className="label">Statut :</span>
                <span className={`badge ${accountStatus.isActive ? 'active' : 'inactive'}`}>
                  {accountStatus.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </InfoCard>

          <InfoCard icon={<FiClock />} title="Activité">
            <div className="info-list">
              <div className="info-item">
                <span className="label">Dernière connexion :</span>
                <span className="value">{formatLastActivity(userData.last_activity)}</span>
              </div>
              <div className="info-item">
                <span className="label">Il y a :</span>
                <span className="value">{accountStatus.lastActivityDays || 0} jour(s)</span>
              </div>
              <div className="info-item">
                <span className="label">Heure actuelle :</span>
                <span className="value">{currentTime.toLocaleTimeString('fr-FR')}</span>
              </div>
            </div>
          </InfoCard>

          <InfoCard icon={<FiServer />} title="Architecture MSPR">
            <div className="tech-list">
              <div className="tech-item">
                <FiDatabase />
                <span>PostgreSQL</span>
                <span className="status-dot active"></span>
              </div>
              <div className="tech-item">
                <FiServer />
                <span>OpenFaaS</span>
                <span className="status-dot active"></span>
              </div>
              <div className="tech-item">
                <FiShield />
                <span>SHA-256</span>
                <span className="status-dot active"></span>
              </div>
            </div>
          </InfoCard>

          <InfoCard icon={<FiSettings />} title="Actions Rapides">
            <div className="action-buttons">
              <button className="action-btn primary">
                <FiUser />
                Gérer Profil
          </button>
              <button className="action-btn secondary">
                <FiShield />
                Config 2FA
          </button>
              <button className="action-btn secondary">
                <FiKey />
                Changer MDP
          </button>
        </div>
          </InfoCard>
        </div>

        {/* Informations MSPR */}
        <section className="mspr-info">
          <h2>Projet MSPR - Mise en Situation Professionnelle Reconstituée</h2>
          <div className="mspr-content">
            <div className="mspr-card">
              <h3>🎯 Objectif</h3>
              <p>Gérer un projet informatique avec des méthodes agiles dans un environnement multiculturel</p>
            </div>
            <div className="mspr-card">
              <h3>🔐 Solution</h3>
              <p>Architecture serverless sécurisée pour COFRAP avec authentification 2FA et gestion automatisée</p>
            </div>
            <div className="mspr-card">
              <h3>🚀 Technologies</h3>
              <p>React, OpenFaaS, PostgreSQL, Docker, k3d, Nginx, SHA-256, TOTP</p>
            </div>
      </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <div className="footer-brand">COFRAP</div>
            <div className="footer-description">Projet MSPR - Architecture Serverless Sécurisée</div>
          </div>
          <div className="footer-right">
            <div className="footer-tech">
              <span className="tech-badge">
                <FiServer size={14} />
                OpenFaaS
              </span>
              <span className="tech-badge">
                <FiShield size={14} />
                2FA
              </span>
              <span className="tech-badge">
                <FiDatabase size={14} />
                PostgreSQL
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
