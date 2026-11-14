import React from 'react';
import { Link } from 'react-router-dom';
export default function Footer() {
  return <footer><div className="container footer-inner"><div><Link className="logo" to="/"><span className="logo-mark">₣</span> Le Meilleur Prix</Link><p>Comparer les prix en Côte d’Ivoire, ensemble.</p></div><div className="footer-links"><Link to="/a-propos">À propos</Link><Link to="/contact">Contact</Link><Link to="/statistiques">Statistiques</Link></div><p>© {new Date().getFullYear()} Le Meilleur Prix · Côte d’Ivoire</p></div></footer>;
}
