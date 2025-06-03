import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/Store';
import Login from './components/authentification/Login';
import Home from './components/pages/Home';

export default function App() {
  // Initialisez `isAuthenticated` à partir de `localStorage`
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true'
  );

  // Mettez à jour `localStorage` lorsque `isAuthenticated` change
  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  // Fonction appelée lors de la connexion réussie
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Fonction de déconnexion
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
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
