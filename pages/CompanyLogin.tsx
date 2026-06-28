import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';
import { useT } from '../src/i18n/LanguageContext';
import { companyAuth } from '../src/services/companyService';

const CompanyLogin: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.warning(t('company.error.fillRequired'));
      return;
    }
    setSending(true);
    try {
      await companyAuth.signIn(form.email, form.password);
      navigate('/espace-entreprise');
    } catch {
      toast.error(t('company.login.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SEO title={t('company.login.title')} description={t('company.login.subtitle')} canonical="/connexion-entreprise" />
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('company.login.title')}</h1>
        <p className="text-gray-500 mb-8">{t('company.login.subtitle')}</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.email')}</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.password')}</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button type="submit" disabled={sending}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
            {sending ? t('company.login.submitting') : t('company.login.submit')}
          </button>
          <p className="text-center text-sm text-gray-500">
            {t('company.login.noAccount')}{' '}
            <Link to="/inscription-entreprise" className="text-blue-600 font-medium hover:underline">{t('company.toRegister')}</Link>
          </p>
        </form>
      </div>
    </>
  );
};

export default CompanyLogin;
