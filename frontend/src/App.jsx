import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import SharePage from './pages/SharePage';
import StatsPage from './pages/StatsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

function App() {
  return <Router><Routes><Route path="/" element={<Layout apiUrl={API_URL} />}>
    <Route index element={<HomePage apiUrl={API_URL} />} />
    <Route path="rechercher" element={<SearchPage apiUrl={API_URL} />} />
    <Route path="partager" element={<SharePage apiUrl={API_URL} />} />
    <Route path="statistiques" element={<StatsPage apiUrl={API_URL} />} />
    <Route path="a-propos" element={<AboutPage />} />
    <Route path="contact" element={<ContactPage apiUrl={API_URL} />} />
    <Route path="connexion" element={<AuthPage apiUrl={API_URL} />} />
    <Route path="inscription" element={<AuthPage apiUrl={API_URL} signup />} />
    <Route path="tableau-de-bord" element={<DashboardPage apiUrl={API_URL} />} />
    <Route path="*" element={<div className="empty-state"><h1>Page introuvable</h1><p>Cette adresse n’existe pas.</p><a className="btn" href="/">Retour à l’accueil</a></div>} />
  </Route></Routes></Router>;
}
export default App;
