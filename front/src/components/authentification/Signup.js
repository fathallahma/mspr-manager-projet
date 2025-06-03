import React, { useState } from 'react';
import axios from 'axios';
import QRCode from 'react-qr-code';

export default function Signup() {
  const [username, setUsername] = useState("");
  const [plainPassword, setPlainPassword] = useState("");
  const [passwordQR, setPasswordQR] = useState(null);
  const [twofaQR, setTwofaQR] = useState(null);
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");

  const baseURL = process.env.REACT_APP_API_API || 'http://localhost:8080';

  const generatePassword = async () => {
    try {
      const response = await axios.post(`${baseURL}/api/v1/user/generate-password`, { username });

      if (response.data && response.data.plainPassword && response.data.qrcode) {
        setPlainPassword(response.data.plainPassword);
        setPasswordQR(response.data.qrcode);
        setStep(2);
        setErrorMessage("");
      } else {
        throw new Error("Données manquantes dans la réponse");
      }
    } catch (error) {
      setErrorMessage("Erreur lors de la génération du mot de passe.");
      console.error(error);
    }
  };

  const generate2FA = async () => {
    try {
      const response = await axios.post(`${baseURL}/api/v1/user/generate-2fa`, { username });

      if (response.data && response.data.qrcode) {
        setTwofaQR(response.data.qrcode);
        setStep(3);
        setErrorMessage("");
      } else {
        throw new Error("QR 2FA manquant dans la réponse");
      }
    } catch (error) {
      setErrorMessage("Erreur lors de la génération du 2FA.");
      console.error(error);
    }
  };

  return (
    <div className="signup-box">
      <h2>Création de compte</h2>

      <input
        type="text"
        placeholder="Nom d'utilisateur"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={step > 1}
      />

      {step === 1 && (
        <button onClick={generatePassword}>Générer mot de passe</button>
      )}

      {step === 2 && plainPassword && (
        <div style={{ marginTop: "2rem" }}>
          <h4>🔐 Mot de passe généré :</h4>
          <p style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{plainPassword}</p>

          {plainPassword && (
            <div style={{ marginBottom: "1rem" }}>
              <QRCode value={plainPassword} />
            </div>
          )}

          <button onClick={generate2FA}>Générer 2FA</button>
        </div>
      )}

      {step === 3 && twofaQR && (
        <div style={{ marginTop: "2rem" }}>
          <h4>📱 Scanner ce code avec Google Authenticator :</h4>
          <img src={twofaQR} alt="QR Code 2FA" style={{ width: '250px' }} />
          <p>Votre compte est prêt à être utilisé avec mot de passe + 2FA.</p>
        </div>
      )}

      {errorMessage && (
        <p style={{ color: "red", marginTop: "1rem" }}>{errorMessage}</p>
      )}
    </div>
  );
}
