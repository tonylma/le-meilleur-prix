import React from 'react';

const Footer = () => {
  return (
    <footer>
      <div className="container">
        <p>&copy; {new Date().getFullYear()} Le Meilleur Prix. Une plateforme citoyenne.</p>
        <p>Mentions Légales | Politique de confidentialité</p>
      </div>
    </footer>
  );
};

export default Footer;