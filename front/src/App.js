import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/Store';
import Login from './components/authentification/Login';
import Home from './components/pages/Home';

export default function App() {
  // L'état d'authentification n'est plus stocké de façon permanente
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fonction appelée lors de la connexion réussie
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Fonction de déconnexion
  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <Provider store={store}>
      <Router>
        <Routes>
        <Route
            path="/"
            element={
              isAuthenticated ? (
                <Home onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/home"
            element={
              isAuthenticated ? (
                <Home onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/home" replace />
              ) : (
                <Login onLogin={handleLoginSuccess} />
              )
            }
          />
        </Routes>
      </Router>
    </Provider>
  );
}
