import React, { useState } from "react";
import "react-calendar/dist/Calendar.css"; // Styles par défaut pour le calendrier
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useSelector } from "react-redux";
import { FiLogOut, FiSettings } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";
import axios from "axios";
import "../../styles/pages/Home.css";
import Logo from "../../assets/logo.png";

// Configuration de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Home({ onLogout }) {
  axios.defaults.baseURL = process.env.REACT_APP_API_API;

  const userData = useSelector((state) => state.user);
  const userId = userData.id;

  return (
    <>
      <div className="header-box">
        <div className="header-title">
          <img src={Logo} alt="Logo" className="header-logo" />
          <h1>Bienvenue {userData.firstName} !</h1>
        </div>
        <div className="header-buttons">
          <button className="icon-button" onClick={onLogout} title="Déconnexion">
            <FiLogOut size={20} />
          </button>
          <button className="icon-button" title="Mode sombre">
            🌙
          </button>
          <button className="icon-button" title="Paramètres">
            <FiSettings size={20} />
          </button>
          <button className="icon-button" title="Profil">
            <FaUserCircle size={20} />
          </button>
        </div>
      </div>

    </>
  );
}
