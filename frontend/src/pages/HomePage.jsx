import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const HomePage = ({ apiUrl }) => {
  const [latestPrices, setLatestPrices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${apiUrl}/prices?_limit=5`)
      .then(res => res.json())
      .then(data => setLatestPrices(data.slice(0, 5)))
      .catch(err => console.error("Erreur de chargement des prix:", err));
  }, [apiUrl]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/rechercher?produit=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div>
      <h1>Trouvez le meilleur prix, ensemble.</h1>
      <p>Recherchez un produit ou partagez un prix pour aider la communauté.</p>
      
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', margin: '2rem 0' }}>
        <input 
          type="text" 
          className="form-control"
          placeholder="Ex: Tomate, Riz, Huile..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flexGrow: 1 }}
        />
        <button type="submit" className="btn">Rechercher</button>
      </form>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem' }}>
        <Link to="/partager" className="btn btn-secondary">📢 Partager un prix</Link>
        <Link to="/statistiques" className="btn">📊 Voir les statistiques</Link>
      </div>

      <h2>Derniers prix partagés</h2>
      {latestPrices.length > 0 ? (
        <ul className="price-list">
          {latestPrices.map(p => (
            <li key={p.id} className="price-item">
              <div className="price-item-info">
                <h3>{p.productName}</h3>
                <p>📍 {p.store.name}, {p.location.city}</p>
                 <p>👤 Partagé par {p.pseudo} le {new Date(p.date).toLocaleDateString()}</p>
              </div>
              <div className="price-tag">{p.price} F CFA / {p.unit}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p>Chargement des derniers prix...</p>
      )}
    </div>
  );
};

export default HomePage;