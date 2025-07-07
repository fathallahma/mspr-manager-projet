import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { connectUser } from "../../store/Store";
import Signup from "./Signup";
import ForgotPassword from "./ForgotPassword";
import "../../styles/authentification/Login.css";

export default function Login({ onLogin }) {
  // Configuration pour OpenFaaS - adapter selon votre déploiement
  const OPENFAAS_GATEWAY =
    process.env.REACT_APP_OPENFAAS_GATEWAY || "http://localhost:8089";

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code2fa, setCode2fa] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  const handleLogin = async () => {
    console.log("Authentification avec fonction MSPR COFRAP...");

    try {
      // Appel à notre fonction authenticate-user
      const response = await axios.post(
        `${OPENFAAS_GATEWAY}/function/authenticate-user`,
        {
          username: username,
          password: password,
          totp_code: code2fa || undefined,
        }
      );

      if (response.status === 200) {
        const data = response.data;

        // Authentification réussie
        dispatch(
          connectUser({
            id: data.user_id,
            username: data.username,
            firstName: data.username, // Utiliser username comme prénom par défaut
            darkMode: false,
            has_2fa: Boolean(data.has_2fa),
            last_activity: data.last_activity,
          })
        );

        onLogin();
        navigate("/home");
        setErrorMessage(null);
        setRequires2FA(false);
      }
    } catch (error) {
      console.error("Erreur de connexion :", error);

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 400:
            if (data.requires_2fa) {
              setRequires2FA(true);
              setErrorMessage("Code 2FA requis pour ce compte");
            } else {
              setErrorMessage(
                "Données manquantes (nom d'utilisateur ou mot de passe)"
              );
            }
            break;
          case 401:
            setErrorMessage(
              "Nom d'utilisateur, mot de passe ou code 2FA incorrect"
            );
            break;
          case 403:
            if (data.expired) {
              setErrorMessage(
                "Votre compte a expiré (inactif depuis plus de 6 mois)"
              );
            } else {
              setErrorMessage("Accès refusé");
            }
            break;
          default:
            setErrorMessage(
              data.error || "Erreur serveur lors de la connexion"
            );
        }
      } else {
        setErrorMessage("Impossible de contacter le serveur");
      }
    } finally {
      // Toujours vider le champ mot de passe après chaque tentative
      setPassword("");
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Valider les champs avant soumission
  const isFormValid = () => {
    if (!username || !password) return false;
    if (requires2FA && !code2fa) return false;
    return true;
  };

  return (
    <div className="login-page">
      <div
        className={`login-box ${
          isSignup || isForgotPassword ? "move-transition" : ""
        }`}
      >
        {isSignup ? (
          <Signup />
        ) : isForgotPassword ? (
          <ForgotPassword />
        ) : (
          <>
            <div className="login-header">
              <div className="brand-icon">🔐</div>
              <h2>COFRAP</h2>
              <p>Espace sécurisé - Authentification 2FA</p>
            </div>

            <div className="login-form">
              <div className="input-group">
                <label>Nom d'utilisateur</label>
                <input
                  type="text"
                  placeholder="Entrez votre nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Mot de passe</label>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe sécurisé (24 caractères)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="show-password"
                    onClick={toggleShowPassword}
                    title={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>Code 2FA {!requires2FA && "(optionnel)"}</label>
                <input
                  type="text"
                  placeholder="Code à 6 chiffres"
                  value={code2fa}
                  onChange={(e) =>
                    setCode2fa(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength="6"
                  pattern="[0-9]{6}"
                />
              </div>

              {requires2FA && (
                <div className="warning-message">
                  <span>⚠️</span>
                  <p>Ce compte nécessite un code 2FA pour se connecter</p>
                </div>
              )}

              {errorMessage && (
                <div className="error-message">
                  <span>❌</span>
                  <p>{errorMessage}</p>
                </div>
              )}

              <button
                className="login-button"
                onClick={handleLogin}
                disabled={!isFormValid()}
              >
                Se connecter
              </button>

              <div className="additional-links">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setPassword("");
                    setErrorMessage(null);
                  }}
                >
                  Mot de passe oublié ?
                </button>
                <span className="separator">•</span>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setIsSignup(true);
                    setPassword("");
                    setErrorMessage(null);
                  }}
                >
                  Créer un compte
                </button>
              </div>
            </div>

            <div className="security-info">
              <div className="security-badge">
                <span className="shield-icon">🛡️</span>
                <div>
                  <strong>Sécurité MSPR</strong>
                  <small>
                    Mots de passe 24 caractères • 2FA TOTP • Expiration 6 mois
                  </small>
                </div>
              </div>
            </div>
          </>
        )}

        {(isSignup || isForgotPassword) && (
          <button
            type="button"
            className="back-button"
            onClick={() => {
              setIsSignup(false);
              setIsForgotPassword(false);
              setPassword("");
              setErrorMessage(null);
            }}
          >
            ← Retour à la connexion
          </button>
        )}
      </div>
    </div>
  );
}
