import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const initialForm = { productName: '', price: '', unit: 'kg', storeType: 'Marché', storeName: '', city: '', neighborhood: '', pseudo: '' };

const SharePage = ({ apiUrl }) => {
  const [formData, setFormData] = useState(initialForm);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const handleChange = event => setFormData(previous => ({ ...previous, [event.target.name]: event.target.value }));

  const handleSubmit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const submission = {
      productName: formData.productName.trim(), price: Number(formData.price), unit: formData.unit,
      store: { type: formData.storeType, name: formData.storeName.trim() },
      location: { city: formData.city.trim(), neighborhood: formData.neighborhood.trim() },
      pseudo: formData.pseudo.trim(),
    };
    try {
      const response = await fetch(`${apiUrl}/prices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submission) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Impossible d’enregistrer ce prix.');
      setMessage({ type: 'success', text: 'Merci ! Votre prix a bien été partagé.' });
      window.setTimeout(() => navigate('/rechercher?produit=' + encodeURIComponent(submission.productName)), 900);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Une erreur est survenue. Réessayez.' });
    } finally { setSubmitting(false); }
  };

  return <section className="share-page">
    <div className="page-heading"><p className="eyebrow">Ensemble, mieux informés</p><h1>Partager un prix</h1><p>Un relevé récent aide les autres à comparer. Les champs marqués d’un * sont requis.</p></div>
    <form onSubmit={handleSubmit} className="share-form">
      <div className="form-group"><label htmlFor="productName">Nom du produit *</label><input id="productName" name="productName" value={formData.productName} onChange={handleChange} className="form-control" autoComplete="off" required maxLength="80" /></div>
      <div className="form-row"><div className="form-group"><label htmlFor="price">Prix (F CFA) *</label><input id="price" name="price" type="number" min="1" max="1000000000" step="1" value={formData.price} onChange={handleChange} className="form-control" required /></div><div className="form-group"><label htmlFor="unit">Unité *</label><select id="unit" name="unit" value={formData.unit} onChange={handleChange} className="form-control"><option>kg</option><option>litre</option><option>pièce</option><option>botte</option><option>sac</option></select></div></div>
      <div className="form-row"><div className="form-group"><label htmlFor="storeType">Type de commerce *</label><select id="storeType" name="storeType" value={formData.storeType} onChange={handleChange} className="form-control"><option>Marché</option><option>Supermarché</option><option>Boutique</option><option>Autre</option></select></div><div className="form-group"><label htmlFor="storeName">Nom du commerce *</label><input id="storeName" name="storeName" value={formData.storeName} onChange={handleChange} className="form-control" required maxLength="100" /></div></div>
      <div className="form-row"><div className="form-group"><label htmlFor="city">Ville *</label><input id="city" name="city" value={formData.city} onChange={handleChange} className="form-control" required maxLength="80" autoComplete="address-level2" /></div><div className="form-group"><label htmlFor="neighborhood">Quartier</label><input id="neighborhood" name="neighborhood" value={formData.neighborhood} onChange={handleChange} className="form-control" maxLength="80" /></div></div>
      <div className="form-group"><label htmlFor="pseudo">Pseudonyme (facultatif)</label><input id="pseudo" name="pseudo" value={formData.pseudo} onChange={handleChange} className="form-control" maxLength="40" autoComplete="nickname" /></div>
      <button type="submit" className="btn submit-button" disabled={submitting}>{submitting ? 'Envoi en cours…' : 'Partager ce prix'}</button>
      {message && <p className={`status-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    </form>
  </section>;
};

export default SharePage;
