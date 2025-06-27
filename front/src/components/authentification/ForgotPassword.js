// ForgotPassword.js
import React, { useState } from 'react';
import axios from 'axios';

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setMessage("L'adresse email est requise");
            return;
        }

        setIsLoading(true);
        setMessage("");

        try {
            // Simulation d'un appel API pour la réinitialisation de mot de passe
            // Dans un vrai système, cela enverrait un email avec un lien de réinitialisation
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulation d'attente
            
            setSuccess(true);
            setMessage("Un email de réinitialisation a été envoyé à votre adresse.");
        } catch (error) {
            setMessage("Erreur lors de l'envoi de l'email de réinitialisation");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setEmail("");
        setMessage("");
        setSuccess(false);
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-header">
                <div className="brand-icon">🔑</div>
                <h2>Mot de passe oublié</h2>
                <p>Réinitialisez votre mot de passe en toute sécurité</p>
            </div>

            <div className="forgot-password-form">
                {!success ? (
                    <>
                        <div className="input-group">
                            <label>Adresse email</label>
            <input 
                                type="email"
                                placeholder="Entrez votre adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
            />
                        </div>

                        <button 
                            className="primary-button"
                            onClick={handleForgotPassword}
                            disabled={!email.trim() || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner"></span>
                                    Envoi en cours...
                                </>
                            ) : (
                                "Envoyer le lien de réinitialisation"
                            )}
                        </button>

                        <div className="info-card">
                            <h4>ℹ️ Comment ça fonctionne :</h4>
                            <ul>
                                <li>Entrez votre adresse email associée au compte</li>
                                <li>Vérifiez votre boîte de réception</li>
                                <li>Cliquez sur le lien dans l'email reçu</li>
                                <li>Créez un nouveau mot de passe sécurisé</li>
                            </ul>
                        </div>
                    </>
                ) : (
                    <div className="success-content">
                        <div className="success-card large">
                            <span>✅</span>
                            <div>
                                <h4>Email envoyé avec succès !</h4>
                                <p>
                                    Un email de réinitialisation a été envoyé à :
                                    <br/><strong>{email}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="info-card">
                            <h4>📧 Prochaines étapes :</h4>
                            <ul>
                                <li>Vérifiez votre boîte de réception</li>
                                <li>Regardez aussi dans vos spams</li>
                                <li>Le lien expire dans 15 minutes</li>
                                <li>Suivez les instructions dans l'email</li>
                            </ul>
                        </div>

                        <button 
                            className="primary-button secondary"
                            onClick={resetForm}
                        >
                            Envoyer un autre email
                        </button>
                    </div>
                )}

                {message && !success && (
                    <div className="error-message">
                        <span>❌</span>
                        <p>{message}</p>
                    </div>
                )}

                <div className="security-info">
                    <div className="security-badge">
                        <span className="shield-icon">🛡️</span>
                        <div>
                            <strong>Sécurité</strong>
                            <small>Lien sécurisé • Expiration 15min • Vérification email</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
