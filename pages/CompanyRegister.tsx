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
    nom_entreprise: '', email: '', password: '', confirmPassword: '', telephone: '', ville: '', secteur: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const mismatch = form.confirmPassword.length > 0 && form.confirmPassword !== form.password;

  const handleGoogle = async () => {
    try { await companyAuth.signInWithGoogle(); }
    catch { toast.error(t('company.error.generic')); }
  };

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
    if (form.password !== form.confirmPassword) {
      toast.warning(t('company.error.passwordMismatch'));
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
          <button type="button" onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 border border-gray-300 rounded-xl py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t('company.withGoogle')}
          </button>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px bg-gray-200 flex-1" />{t('company.or')}<span className="h-px bg-gray-200 flex-1" />
          </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.confirmPassword')} *</label>
            <input type="password" required value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 ${
                mismatch ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-blue-500'
              }`} />
            {mismatch && <p className="text-xs text-red-500 mt-1">{t('company.error.passwordMismatch')}</p>}
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

          <button type="submit" disabled={sending || mismatch}
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
