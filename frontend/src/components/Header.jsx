import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return <header className="site-header">
    <div className="container header-inner">
      <Link to="/" className="logo" onClick={closeMenu}><span className="logo-mark" aria-hidden="true">₣</span> Le Meilleur Prix</Link>
      <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(open => !open)}><span /><span /><span /></button>
      <nav id="main-navigation" className={menuOpen ? 'navigation is-open' : 'navigation'} aria-label="Navigation principale">
        <NavLink to="/rechercher" onClick={closeMenu}>Rechercher</NavLink>
        <NavLink to="/partager" onClick={closeMenu}>Partager un prix</NavLink>
        <NavLink to="/statistiques" onClick={closeMenu}>Statistiques</NavLink>
        <NavLink to="/a-propos" onClick={closeMenu}>À propos</NavLink>
      </nav>
    </div>
  </header>;
};

export default Header;
