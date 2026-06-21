import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { supabaseOffers } from '../src/services/supabase';
import SEO from '../components/SEO';

const SUBJECTS = [
  'Publier une offre d\'emploi',
  'Question sur une offre',
  'Partenariat',
  'Autre',
];

const Contact: React.FC = () => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: SUBJECTS[0],
    body: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.body) {
      toast.warning('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabaseOffers
        .from('messages')
        .insert({
          sender_name: form.name,
          sender_email: form.email,
          sender_phone: form.phone || null,
          subject: form.subject,
          body: form.body,
        });

      if (error) throw error;

      setSent(true);
      toast.success('Message envoyé avec succès !');
    } catch (err: any) {
      console.error('Erreur envoi message:', err);
      toast.error('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <>
        <SEO title="Contact" description="Contactez l'équipe SoussMassa-RH pour publier vos offres ou poser vos questions." canonical="/contact" />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
            <div className="text-4xl mb-4">&#10003;</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Message envoyé</h1>
            <p className="text-gray-600">Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Contact" description="Contactez l'équipe SoussMassa-RH pour publier vos offres d'emploi ou poser vos questions." canonical="/contact" />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Nous contacter</h1>
        <p className="text-gray-500 mb-8">Vous souhaitez publier une offre, poser une question ou proposer un partenariat ? Écrivez-nous.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Votre nom"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="votre@email.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="06 XX XX XX XX"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sujet *</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              required
              rows={5}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Votre message..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {sending ? 'Envoi en cours...' : 'Envoyer le message'}
          </button>
        </form>
      </div>
    </>
  );
};

export default Contact;
