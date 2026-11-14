import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const FAVORITES_KEY = 'le-meilleur-prix:favorites';

function readFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

const SearchPage = ({ apiUrl }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [product, setProduct] = useState(searchParams.get('produit') || '');
  const [city, setCity] = useState(searchParams.get('ville') || '');
  const [sort, setSort] = useState('price-asc');
  const [prices, setPrices] = useState([]);
  const [favorites, setFavorites] = useState(readFavorites);
  const [showFavorites, setShowFavorites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (product.trim()) params.set('product', product.trim());
    if (city.trim()) params.set('city', city.trim());
    setLoading(true);
    setError('');
    fetch(`${apiUrl}/prices?${params}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Impossible de charger les prix. Réessayez.');
        return response.json();
      })
      .then(data => setPrices(Array.isArray(data) ? data : []))
      .catch(reason => { if (reason.name !== 'AbortError') setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apiUrl, searchParams]);

  const results = useMemo(() => {
    const filtered = prices.filter(item => !showFavorites || favorites.has(String(item.id)));
    return [...filtered].sort((a, b) => sort === 'price-desc' ? b.price - a.price : sort === 'recent' ? new Date(b.date) - new Date(a.date) : a.price - b.price);
  }, [prices, favorites, showFavorites, sort]);
  const average = results.length ? results.reduce((sum, item) => sum + Number(item.price || 0), 0) / results.length : 0;

  const submitSearch = event => {
    event.preventDefault();
    const params = {};
    if (product.trim()) params.produit = product.trim();
    if (city.trim()) params.ville = city.trim();
    setSearchParams(params);
  };
  const toggleFavorite = id => setFavorites(current => {
    const next = new Set(current);
    next.has(String(id)) ? next.delete(String(id)) : next.add(String(id));
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next])); } catch { /* Storage may be disabled. */ }
    return next;
  });

  return (
    <section>
      <div className="page-heading"><p className="eyebrow">Comparer près de chez vous</p><h1>Rechercher un produit</h1><p>Filtrez les relevés de prix par produit et par ville.</p></div>
      <form onSubmit={submitSearch} className="search-filters" aria-label="Filtres de recherche">
        <div className="form-group"><label htmlFor="product">Produit</label><input id="product" type="search" className="form-control" value={product} onChange={event => setProduct(event.target.value)} placeholder="Tomate, riz…" maxLength="80" /></div>
        <div className="form-group"><label htmlFor="city">Ville</label><input id="city" type="search" className="form-control" value={city} onChange={event => setCity(event.target.value)} placeholder="Toutes les villes" maxLength="80" /></div>
        <button type="submit" className="btn" disabled={loading}>Rechercher</button>
      </form>
      <div className="results-toolbar">
        <label className="sort-control" htmlFor="sort">Trier par <select id="sort" className="form-control" value={sort} onChange={event => setSort(event.target.value)}><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option><option value="recent">Plus récents</option></select></label>
        <button type="button" className={`btn btn-outline ${showFavorites ? 'selected' : ''}`} onClick={() => setShowFavorites(value => !value)} aria-pressed={showFavorites}>♥ Favoris ({favorites.size})</button>
      </div>
      {loading && <p className="status-message" role="status">Recherche en cours…</p>}
      {error && <p className="status-message error" role="alert">{error}</p>}
      {!loading && !error && <>
        <div className="results-summary"><strong>{results.length} prix trouvé{results.length > 1 ? 's' : ''}</strong>{results.length > 0 && <span>Prix moyen : <strong>{average.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} F CFA</strong></span>}</div>
        {results.length ? <ul className="price-list">{results.map(item => <li key={item.id} className="price-item">
          <div className="price-item-info"><h2>{item.productName}</h2><p>📍 {item.store?.type} · {item.store?.name}</p><p>{item.location?.neighborhood ? `${item.location.neighborhood}, ` : ''}{item.location?.city}</p><p className="muted">Partagé par {item.pseudo || 'Anonyme'} · {new Date(item.date).toLocaleDateString('fr-FR')}</p></div>
          <div className="price-item-actions"><strong className="price-tag">{Number(item.price).toLocaleString('fr-FR')} F CFA <small>/ {item.unit}</small></strong><button className={`favorite-button ${favorites.has(String(item.id)) ? 'is-favorite' : ''}`} type="button" onClick={() => toggleFavorite(item.id)} aria-label={`${favorites.has(String(item.id)) ? 'Retirer des' : 'Ajouter aux'} favoris : ${item.productName}`} aria-pressed={favorites.has(String(item.id))}>{favorites.has(String(item.id)) ? '♥' : '♡'}</button></div>
        </li>)}</ul> : <div className="empty-state"><h2>{showFavorites ? 'Aucun favori affiché' : 'Aucun prix trouvé'}</h2><p>{showFavorites ? 'Ajoutez un prix à vos favoris avec le bouton cœur.' : 'Essayez une autre recherche ou partagez le premier prix.'}</p></div>}
      </>}
    </section>
  );
};

export default SearchPage;
