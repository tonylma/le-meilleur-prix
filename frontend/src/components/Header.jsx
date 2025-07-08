import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const Header = () => {
  return (
    <header>
      <div className="container">
        <Link to="/" className="logo">🛒 Le Meilleur Prix</Link>
        <nav>
          <NavLink to="/rechercher">Rechercher</NavLink>
          <NavLink to="/partager">Partager un prix</NavLink>
          <NavLink to="/statistiques">Statistiques</NavLink>
          <NavLink to="/a-propos">À Propos</NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;