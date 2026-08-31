import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';
import { useT } from '../src/i18n/LanguageContext';
import { INSCRIPTION_CANDIDAT_OUVERTE } from '../src/config/features';
import { candidateAuth, candidateService } from '../src/services/candidateService';
import { companyService } from '../src/services/companyService';

const CandidateLogin: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.warning(t('cand.error.fillRequired'));
      return;
    }
    setSending(true);
    try {
      const user = await candidateAuth.signIn(form.email, form.password);

      // Un compte entreprise qui se trompe de formulaire recevait « email ou
      // mot de passe incorrect » alors que ses identifiants etaient bons : on
      // le renvoie vers le bon espace au lieu de le laisser dans le doute.
      // On ne se contente pas de l'absence de fiche candidat pour conclure :
      // un compte cree via Google n'en a pas encore, et le tableau de bord la
      // cree. Seule la presence d'une fiche ENTREPRISE tranche.
      if (user) {
        const [candidate, company] = await Promise.all([
          candidateService.getProfile(user.id),
          companyService.getProfile(user.id),
        ]);
        if (!candidate && company) {
          toast.info(t('cand.login.isCompany'));
          navigate('/espace-entreprise');
          return;
        }
      }
      navigate('/espace-candidat');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (/not confirmed/i.test(msg)) toast.error(t('cand.login.notConfirmed'));
      else if (/rate limit|too many/i.test(msg)) toast.error(t('cand.login.rateLimited'));
      else toast.error(t('cand.login.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SEO title={t('cand.login.title')} description={t('cand.login.subtitle')} canonical="/connexion-candidat" />
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('cand.login.title')}</h1>
        <p className="text-gray-500 mb-8">{t('cand.login.subtitle')}</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.email')}</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.password')}</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <button type="submit" disabled={sending}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors disabled:opacity-60">
            {sending ? t('cand.login.submitting') : t('cand.login.submit')}
          </button>
          {/* Les comptes existants se connectent toujours ; on ne propose l'inscription
              que si elle est ouverte. */}
          {INSCRIPTION_CANDIDAT_OUVERTE && (
            <p className="text-center text-sm text-gray-500">
              {t('cand.login.noAccount')}{' '}
              <Link to="/inscription-candidat" className="text-orange-600 font-medium hover:underline">{t('cand.toRegister')}</Link>
            </p>
          )}
        </form>
      </div>
    </>
  );
};

export default CandidateLogin;
