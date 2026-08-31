import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';
import { useT } from '../src/i18n/LanguageContext';
import { candidateAuth } from '../src/services/candidateService';
import { EmailAlreadyRegisteredError } from '../src/services/companyService';
import { INSCRIPTION_CANDIDAT_OUVERTE } from '../src/config/features';

const CandidateRegister: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ nom_complet: '', email: '', password: '' });
  // Consentement explicite, coche par defaut mais decochable : c'est ce qui
  // distingue une CVtheque legitime d'un fichier constitue a l'insu des gens.
  const [consent, setConsent] = useState(true);

  // Inscriptions fermees : on renvoie vers les offres, ou le depot de CV reste
  // possible en postulant. `replace` pour que le bouton « retour » du
  // navigateur ne ramene pas sur une page vide.
  useEffect(() => {
    if (!INSCRIPTION_CANDIDAT_OUVERTE) navigate('/offres', { replace: true });
  }, [navigate]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_complet.trim() || !form.email.trim() || !form.password) {
      toast.warning(t('cand.error.fillRequired'));
      return;
    }
    if (form.password.length < 8) {
      toast.warning(t('cand.error.passwordShort'));
      return;
    }
    setSending(true);
    try {
      await candidateAuth.signUp(form.email.trim(), form.password, form.nom_complet, consent);
      navigate('/espace-candidat');
    } catch (err: any) {
      if (err instanceof EmailAlreadyRegisteredError) toast.error(t('cand.register.emailTaken'));
      else toast.error(err?.message || t('cand.error.generic'));
    } finally {
      setSending(false);
    }
  };

  if (!INSCRIPTION_CANDIDAT_OUVERTE) return null;

  return (
    <>
      <SEO title={t('cand.register.title')} description={t('cand.register.subtitle')} canonical="/inscription-candidat" />
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('cand.register.title')}</h1>
        <p className="text-gray-500 mb-8">{t('cand.register.subtitle')}</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.fullName')} *</label>
            <input type="text" required value={form.nom_complet} onChange={(e) => set('nom_complet', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.email')} *</label>
            <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="votre@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.password')} *</label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">{t('cand.passwordHint')}</p>
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-orange-500" />
            <span>{t('cand.register.consent')}</span>
          </label>

          <button type="submit" disabled={sending}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors disabled:opacity-60">
            {sending ? t('cand.register.submitting') : t('cand.register.submit')}
          </button>
          <p className="text-center text-sm text-gray-500">
            {t('cand.register.haveAccount')}{' '}
            <Link to="/connexion-candidat" className="text-orange-600 font-medium hover:underline">{t('cand.toLogin')}</Link>
          </p>
        </form>
      </div>
    </>
  );
};

export default CandidateRegister;
