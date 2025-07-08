import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const SearchPage = ({ apiUrl }) => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const query = useQuery();
  const [product, setProduct] = useState(query.get('produit') || '');
  const [city, setCity] = useState(query.get('ville') || 'Bouaké');

  const fetchPrices = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (product) params.append('product', product);
    if (city) params.append('city', city);
    
    fetch(`${apiUrl}/prices?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setPrices(data);
        setLoading(false);
      })
      .catch(err => {
        setError("Impossible de charger les données.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPrices();
  }, []); // Fetch on initial load

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPrices();
  };

  const averagePrice = prices.length > 0
    ? (prices.reduce((acc, p) => acc + p.price, 0) / prices.length).toFixed(2)
    : 0;

  return (
    <div>
      <h1>Rechercher un produit</h1>
      <form onSubmit={handleSearch} className="search-filters">
        <div className="form-group">
          <label htmlFor="product">Produit</label>
          <input type="text" id="product" className="form-control" value={product} onChange={e => setProduct(e.target.value)} placeholder="Tomate, Riz..." />
        </div>
        <div className="form-group">
          <label htmlFor="city">Ville</label>
          <input type="text" id="city" className="form-control" value={city} onChange={e => setCity(e.target.value)} placeholder="Bouaké, Abidjan..." />
        </div>
        <button type="submit" className="btn" style={{ alignSelf: 'end' }}>Filtrer</button>
      </form>

      {loading && <p>Recherche en cours...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!loading && !error && (
        <>
          <h2>Résultats pour "{product}" à {city}</h2>
          {prices.length > 0 ? (
            <>
              <div style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>
                <strong>Prix moyen constaté : </strong> 
                <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{averagePrice} F CFA</span>
              </div>
              <ul className="price-list">
                {prices.sort((a,b) => a.price - b.price).map(p => (
                  <li key={p.id} className="price-item">
                    <div className="price-item-info">
                      <h3>{p.productName}</h3>
                      <p>📍 {p.store.type} - {p.store.name} ({p.location.neighborhood}, {p.location.city})</p>
                      <p>👤 Partagé par {p.pseudo} le {new Date(p.date).toLocaleDateString()}</p>
                    </div>
                    <div className="price-tag">{p.price} F CFA / {p.unit}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Aucun résultat trouvé. Soyez le premier à partager un prix pour ce produit !</p>
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;