import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';
import { useT } from '../src/i18n/LanguageContext';
import { SOUSS_MASSA_CITIES } from '../constants';
import { companyAuth } from '../src/services/companyService';

const SECTORS = ['informatique', 'commercial', 'administratif', 'industrie', 'sante', 'enseignement', 'tourisme', 'construction'];

const CompanyRegister: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    nom_entreprise: '', email: '', password: '', telephone: '', ville: '', secteur: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_entreprise || !form.email || !form.password) {
      toast.warning(t('company.error.fillRequired'));
      return;
    }
    if (form.password.length < 8) {
      toast.warning(t('company.error.passwordShort'));
      return;
    }
    setSending(true);
    try {
      await companyAuth.signUp(form.email, form.password, {
        nom_entreprise: form.nom_entreprise,
        telephone: form.telephone,
        ville: form.ville,
        secteur: form.secteur,
      });
      setSent(true);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (/registered|already/i.test(msg)) toast.error(t('company.login.error'));
      else toast.error(t('company.error.generic'));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <>
        <SEO title={t('company.register.title')} canonical="/inscription-entreprise" />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('company.register.successTitle')}</h1>
            <p className="text-gray-600">{t('company.register.successText')}</p>
            <button onClick={() => navigate('/connexion-entreprise')} className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
              {t('company.toLogin')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title={t('company.register.title')} description={t('company.register.subtitle')} canonical="/inscription-entreprise" />
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('company.register.title')}</h1>
        <p className="text-gray-500 mb-8">{t('company.register.subtitle')}</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.companyName')} *</label>
            <input type="text" required value={form.nom_entreprise} onChange={(e) => set('nom_entreprise', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.email')} *</label>
            <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contact@entreprise.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.password')} *</label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">{t('company.passwordHint')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.phone')}</label>
              <input type="tel" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="06 XX XX XX XX"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.city')}</label>
              <select value={form.ville} onChange={(e) => set('ville', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">—</option>
                {SOUSS_MASSA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.sector')}</label>
            <select value={form.secteur} onChange={(e) => set('secteur', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">—</option>
              {SECTORS.map((s) => <option key={s} value={s}>{t(`sector.${s}`)}</option>)}
            </select>
          </div>

          <button type="submit" disabled={sending}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
            {sending ? t('company.register.submitting') : t('company.register.submit')}
          </button>
          <p className="text-center text-sm text-gray-500">
            {t('company.register.haveAccount')}{' '}
            <Link to="/connexion-entreprise" className="text-blue-600 font-medium hover:underline">{t('company.toLogin')}</Link>
          </p>
        </form>
      </div>
    </>
  );
};

export default CompanyRegister;
