import React, { useState } from 'react';

export default function ContactPage({ apiUrl }) {
  const [message, setMessage] = useState(''); const [sending, setSending] = useState(false);
  async function submit(event) {
    event.preventDefault(); setSending(true); setMessage(''); const form = new FormData(event.currentTarget);
    try { const response = await fetch(`${apiUrl}/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setMessage('Merci, votre message a bien été envoyé.'); event.currentTarget.reset(); }
    catch (error) { setMessage(error.message || 'Impossible d’envoyer le message.'); } finally { setSending(false); }
  }
  return <section><div className="page-heading"><p className="eyebrow">Nous sommes à votre écoute</p><h1>Contactez-nous</h1><p>Une question ou une suggestion ? Écrivez-nous.</p></div><form className="share-form" onSubmit={submit}><div className="form-group"><label htmlFor="contact-name">Nom</label><input id="contact-name" name="name" className="form-control" required maxLength="80" /></div><div className="form-group"><label htmlFor="contact-email">E-mail</label><input id="contact-email" name="email" type="email" className="form-control" required maxLength="254" /></div><div className="form-group"><label htmlFor="contact-message">Message</label><textarea id="contact-message" name="message" className="form-control" rows="6" required maxLength="2000" /></div><button className="btn submit-button" disabled={sending}>{sending ? 'Envoi…' : 'Envoyer le message'}</button>{message && <p className="status-message" role="status">{message}</p>}</form></section>;
}
