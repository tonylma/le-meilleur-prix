import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

const labels = {
  fr: { home: 'Accueil', search: 'Rechercher', share: 'Partager un prix', stats: 'Statistiques', about: 'À propos', contact: 'Contact', login: 'Connexion', dashboard: 'Mon espace', language: 'EN' },
  en: { home: 'Home', search: 'Search', share: 'Share a price', stats: 'Statistics', about: 'About', contact: 'Contact', login: 'Sign in', dashboard: 'My dashboard', language: 'FR' },
};
export default function Header({ apiUrl }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('lmp-language') || 'fr');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const t = labels[language];
  const closeMenu = () => setMenuOpen(false);
  useEffect(() => { document.documentElement.lang = language; localStorage.setItem('lmp-language', language); }, [language]);
  useEffect(() => { fetch(`${apiUrl}/auth/me`, { credentials: 'include' }).then(response => response.ok ? response.json() : null).then(data => setUser(data?.user || null)).catch(() => {}); }, [apiUrl]);
  const signOut = async () => { await fetch(`${apiUrl}/auth/signout`, { method: 'POST', credentials: 'include' }); setUser(null); navigate('/'); closeMenu(); };
  return <header className="site-header"><div className="container header-inner">
    <Link to="/" className="logo" onClick={closeMenu}><span className="logo-mark" aria-hidden="true">₣</span> Le Meilleur Prix</Link>
    <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(value => !value)}><span /><span /><span /></button>
    <nav id="main-navigation" className={menuOpen ? 'navigation is-open' : 'navigation'} aria-label="Navigation principale">
      <NavLink to="/" end onClick={closeMenu}>{t.home}</NavLink><NavLink to="/rechercher" onClick={closeMenu}>{t.search}</NavLink><NavLink to="/partager" onClick={closeMenu}>{t.share}</NavLink><NavLink to="/statistiques" onClick={closeMenu}>{t.stats}</NavLink><NavLink to="/a-propos" onClick={closeMenu}>{t.about}</NavLink><NavLink to="/contact" onClick={closeMenu}>{t.contact}</NavLink>
      {user ? <><NavLink to="/tableau-de-bord" onClick={closeMenu}>{t.dashboard}</NavLink><button type="button" className="nav-button" onClick={signOut}>{language === 'fr' ? 'Déconnexion' : 'Sign out'}</button></> : <NavLink to="/connexion" onClick={closeMenu}>{t.login}</NavLink>}
      <button type="button" className="language-toggle" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} aria-label={language === 'fr' ? 'Switch to English' : 'Passer en français'}>{t.language}</button>
    </nav>
  </div></header>;
}
