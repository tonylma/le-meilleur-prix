import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SharePage = ({ apiUrl }) => {
  const [formData, setFormData] = useState({
    productName: '', price: '', unit: 'kg', storeType: 'Marché',
    storeName: '', city: 'Bouaké', neighborhood: '', pseudo: ''
  });
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage({ type: 'info', text: 'Envoi en cours...' });

    const submission = {
      productName: formData.productName,
      price: parseFloat(formData.price),
      unit: formData.unit,
      store: {
        type: formData.storeType,
        name: formData.storeName,
      },
      location: {
        city: formData.city,
        neighborhood: formData.neighborhood,
      },
      pseudo: formData.pseudo,
    };

    fetch(`${apiUrl}/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.message) });
        }
        return res.json();
    })
    .then(data => {
      setMessage({ type: 'success', text: 'Merci ! Votre prix a bien été ajouté.' });
      setTimeout(() => navigate('/'), 2000);
    })
    .catch(err => {
      setMessage({ type: 'error', text: `Erreur : ${err.message}` });
    });
  };

  return (
    <div>
      <h1>Partager un prix 📢</h1>
      <p>Votre contribution est précieuse. Remplissez ce formulaire simple pour aider la communauté.</p>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <div className="form-group">
          <label>Nom du produit *</label>
          <input type="text" name="productName" value={formData.productName} onChange={handleChange} className="form-control" required />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{flex: 2}}>
                <label>Prix (en F CFA) *</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} className="form-control" required />
            </div>
            <div className="form-group" style={{flex: 1}}>
                <label>Unité *</label>
                <select name="unit" value={formData.unit} onChange={handleChange} className="form-control" required>
                    <option value="kg">kg</option>
                    <option value="litre">litre</option>
                    <option value="pièce">pièce</option>
                    <option value="botte">botte</option>
                </select>
            </div>
        </div>
        {/* ... Autres champs ... */}
        <div className="form-group">
            <label>Ville *</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} className="form-control" required/>
        </div>
        <div className="form-group">
            <label>Pseudonyme (facultatif)</label>
            <input type="text" name="pseudo" value={formData.pseudo} onChange={handleChange} className="form-control" />
        </div>
        
        <button type="submit" className="btn" style={{ width: '100%' }}>Envoyer le prix</button>

        {message && (
          <p style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            borderRadius: '8px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24'
          }}>
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
};

export default SharePage;