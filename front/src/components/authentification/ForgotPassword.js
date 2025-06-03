// ForgotPassword.js
import React, { useState } from 'react';
import axios from 'axios';

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

    const handleForgotPassword = () => {
        console.log("Signing up with");
    };

    return (
        <div className="forgotPassword-box">
            <h2>Réinitialiser le mot de passe</h2>
            <input 
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={handleForgotPassword}>Envoyer</button>
            {message && <p>{message}</p>}
        </div>
    );
}
