import React, { useState } from 'react';
import axios from 'axios';

export default function Signup() {
  const [username, setUsername] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [passwordQR, setPasswordQR] = useState(null);
  const [mfaSecret, setMfaSecret] = useState("");
  const [twofaQR, setTwofaQR] = useState(null);
  const [totpUri, setTotpUri] = useState("");
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Configuration pour OpenFaaS - adapter selon votre déploiement
  const OPENFAAS_GATEWAY = process.env.REACT_APP_OPENFAAS_GATEWAY || 'http://localhost:8089';

  const generatePassword = async () => {
    if (!username.trim()) {
      setErrorMessage("Le nom d'utilisateur est requis");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      // Appel à notre fonction generate-password
      const response = await axios.post(`${OPENFAAS_GATEWAY}/function/generate-password`, {
        username: username.trim()
      });

      if (response.status === 200) {
        const data = response.data;
        
        setGeneratedPassword(data.password);
        setPasswordQR(data.qrcode);
        setSuccessMessage(`Utilisateur "${data.username}" créé avec succès !`);
        setStep(2);
        setErrorMessage("");
      }
    } catch (error) {
      console.error("Erreur génération mot de passe:", error);
      if (error.response) {
        if (error.response.status === 409) {
          setErrorMessage("Ce nom d'utilisateur existe déjà");
        } else {
          setErrorMessage(error.response.data?.error || "Erreur serveur lors de la génération du mot de passe");
        }
      } else {
        setErrorMessage("Impossible de contacter le serveur");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generate2FA = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      // Appel à notre fonction generate-2fa
      const response = await axios.post(`${OPENFAAS_GATEWAY}/function/generate-2fa`, {
        username: username.trim()
      });

      if (response.status === 200) {
        const data = response.data;
        
        setMfaSecret(data.mfa_secret);
        setTwofaQR(data.qr_code);
        setTotpUri(data.totp_uri);
        setSuccessMessage("2FA activé avec succès ! Votre compte est maintenant sécurisé.");
        setStep(3);
        setErrorMessage("");
      }
    } catch (error) {
      console.error("Erreur génération 2FA:", error);
      if (error.response) {
        if (error.response.status === 404) {
          setErrorMessage("Utilisateur non trouvé. Veuillez d'abord générer le mot de passe.");
        } else if (error.response.status === 409) {
          setErrorMessage("2FA déjà activé pour cet utilisateur");
        } else {
          setErrorMessage(error.response.data?.error || "Erreur serveur lors de la génération du 2FA");
        }
      } else {
        setErrorMessage("Impossible de contacter le serveur");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setUsername("");
    setGeneratedPassword("");
    setPasswordQR(null);
    setMfaSecret("");
    setTwofaQR(null);
    setTotpUri("");
    setStep(1);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccessMessage("Copié dans le presse-papiers !");
      setTimeout(() => setSuccessMessage(""), 2000);
    });
  };

  return (
    <div className="signup-container">
      <div className="signup-header">
        <div className="brand-icon">✨</div>
        <h2>Créer un compte COFRAP</h2>
        <p>Processus sécurisé en 3 étapes</p>
      </div>

      {/* Progress indicator */}
      <div className="progress-container">
        <div className="progress-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Utilisateur</span>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Mot de passe</span>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">2FA</span>
          </div>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="signup-form">
        {/* Étape 1: Nom d'utilisateur */}
        <div className="input-group">
          <label>Nom d'utilisateur</label>
      <input
        type="text"
            placeholder="Choisissez un nom d'utilisateur unique"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={step > 1}
      />
        </div>

      {step === 1 && (
          <div className="step-content">
            <button 
              className="primary-button"
              onClick={generatePassword}
              disabled={!username.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Génération...
                </>
              ) : (
                "Étape 1: Générer mot de passe"
              )}
            </button>
            
            <div className="info-card">
              <h3>📋 Ce qui sera généré :</h3>
              <ul>
                <li>Mot de passe sécurisé 24 caractères</li>
                <li>QR code pour faciliter la saisie</li>
                <li>Hashage SHA-512 (compatibilité SHA-256) en base de données</li>
              </ul>
            </div>
          </div>
        )}

        {/* Étape 2: Mot de passe généré */}
        {step === 2 && generatedPassword && (
          <div className="step-content">
            <div className="generated-content">
              <h3>🔐 Mot de passe généré</h3>
              
              <div className="password-display">
                <input
                  className="password-input"
                  type="text"
                  readOnly
                  value={generatedPassword}
                  onFocus={(e)=>e.target.select()}
                />
                <button 
                  className="copy-button"
                  onClick={() => copyToClipboard(generatedPassword)}
                  title="Copier le mot de passe"
                >
                  📋
                </button>
              </div>

              {passwordQR && (
                <div className="qr-section">
                  <p>QR Code pour scanner le mot de passe :</p>
                  <div className="qr-container">
                    <img 
                      src={`data:image/png;base64,${passwordQR}`}
                      alt="QR Code Mot de passe" 
                      className="qr-image"
                    />
                  </div>
                  <small className="warning-text">
                    ⚠️ Ce QR contient uniquement le mot de passe. Ne le scannez pas avec une application 2FA.
                  </small>
                </div>
              )}

              <div className="warning-card">
                <span>⚠️</span>
                <p>Notez bien votre mot de passe avant de continuer !</p>
              </div>

              <button 
                className="primary-button secondary"
                onClick={generate2FA}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Activation...
                  </>
                ) : (
                  "Étape 2: Activer 2FA"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Étape 3: 2FA configuré */}
        {step === 3 && twofaQR && (
          <div className="step-content">
            <div className="generated-content">
              <h3>📱 Configuration 2FA</h3>
              
              <div className="qr-section">
                <div className="qr-container large">
                  <img 
                    src={`data:image/png;base64,${twofaQR}`}
                    alt="QR Code 2FA" 
                    className="qr-image large"
                  />
                </div>
              </div>

              <div className="instructions-card">
                <h5>Instructions de configuration :</h5>
                <ol>
                  <li>Ouvrez Google Authenticator ou Authy</li>
                  <li>Scannez le QR code ci-dessus</li>
                  <li>Votre compte apparaîtra avec des codes à 6 chiffres</li>
                </ol>
              </div>

              {mfaSecret && (
                <div className="secret-section">
                  <label>Secret 2FA (sauvegarde) :</label>
                  <div className="secret-display">
                    <span className="secret-text">{mfaSecret}</span>
                    <button 
                      className="copy-button"
                      onClick={() => copyToClipboard(mfaSecret)}
                      title="Copier le secret"
                    >
                      📋
                    </button>
                  </div>
            </div>
          )}

              <div className="success-card">
                <span>✅</span>
                <div>
                  <h5>Compte créé avec succès !</h5>
                  <p>
                    Vous pouvez maintenant vous connecter avec :
                    <br/>• Nom d'utilisateur : <strong>{username}</strong>
                    <br/>• Mot de passe de 24 caractères
                    <br/>• Code 2FA de votre application
                  </p>
                </div>
              </div>

              <button 
                className="primary-button success"
                onClick={resetForm}
              >
                Créer un autre compte
              </button>

              {totpUri && (
                <div className="uri-section">
                  <label>URI TOTP (copie manuelle) :</label>
                  <div className="uri-display">
                    <span className="uri-text">{totpUri}</span>
                    <button 
                      className="copy-button"
                      onClick={() => copyToClipboard(totpUri)}
                      title="Copier l'URI"
                    >
                      📋
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      )}

        {/* Messages d'état */}
        {successMessage && (
          <div className="success-message">
            <span>✅</span>
            <p>{successMessage}</p>
        </div>
      )}

      {errorMessage && (
          <div className="error-message">
            <span>❌</span>
            <p>{errorMessage}</p>
          </div>
      )}
      </div>
    </div>
  );
}
