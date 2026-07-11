import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';
import { useT, cityLabel, contractLong } from '../src/i18n/LanguageContext';
import { SOUSS_MASSA_CITIES } from '../constants';
import { companyAuth, companyService, CompanyProfile } from '../src/services/companyService';

const CONTRACTS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
const STATUS_STYLE: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  refuse: 'bg-red-100 text-red-700',
};
const emptyForm = { emploi_metier: '', ville: '', type_contrat: 'CDI', nbre_postes: 1, suggested_salary_range: '', full_description: '', skills: '' };

const CompanyDashboard: React.FC = () => {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [sending, setSending] = useState(false);
  const [profForm, setProfForm] = useState({ nom_entreprise: '', telephone: '', ville: '', secteur: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await companyAuth.currentUser();
      if (!user) { navigate('/connexion-entreprise'); return; }
      setAccount({ id: user.id, email: user.email || '' });
      const prof = await companyService.getProfile(user.id);
      setProfile(prof);
      if (prof && prof.statut === 'valide') {
        setOffers(await companyService.getMyOffers(user.id));
      }
      setLoading(false);
    })();
  }, [navigate]);

  const logout = async () => { await companyAuth.signOut(); navigate('/connexion-entreprise'); };

  // Utilisateur authentifie (ex: Google) mais sans profil entreprise : on le cree.
  const completeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !profForm.nom_entreprise) { toast.warning(t('company.error.fillRequired')); return; }
    setSavingProfile(true);
    try {
      await companyService.createProfile(account.id, account.email, profForm);
      setProfile(await companyService.getProfile(account.id));
    } catch {
      toast.error(t('company.error.generic'));
    } finally {
      setSavingProfile(false);
    }
  };

  const submitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.emploi_metier || !form.ville || !form.full_description) {
      toast.warning(t('company.error.fillRequired'));
      return;
    }
    setSending(true);
    try {
      await companyService.createOffer(profile, {
        emploi_metier: form.emploi_metier,
        ville: form.ville,
        type_contrat: form.type_contrat,
        nbre_postes: Number(form.nbre_postes) || 1,
        suggested_salary_range: form.suggested_salary_range,
        full_description: form.full_description,
        required_skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast.success(t('company.post.success'));
      setForm({ ...emptyForm });
      setOffers(await companyService.getMyOffers(profile.id));
    } catch {
      toast.error(t('company.error.generic'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  }

  // NB: fonction (pas un composant <Shell>) pour éviter le remontage du sous-arbre
  // à chaque frappe (qui faisait perdre le focus des inputs).
  const shell = (children: React.ReactNode) => (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('company.dash.title')}</h1>
          {profile && <p className="text-gray-500 text-sm mt-1">{t('company.dash.welcome', { name: profile.nom_entreprise })}</p>}
        </div>
        <button onClick={logout} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
          {t('company.dash.logout')}
        </button>
      </div>
      {children}
    </div>
  );

  // Compte authentifie (ex: Google) sans profil entreprise → completer le profil
  if (!profile) {
    return shell(
      <>
        <form onSubmit={completeProfile} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 max-w-lg">
          <h2 className="text-lg font-bold text-gray-900">{t('company.completeProfile.title')}</h2>
          <p className="text-sm text-gray-500">{t('company.completeProfile.subtitle')}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.companyName')} *</label>
            <input type="text" required value={profForm.nom_entreprise} onChange={(e) => setProfForm({ ...profForm, nom_entreprise: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.phone')}</label>
              <input type="tel" value={profForm.telephone} onChange={(e) => setProfForm({ ...profForm, telephone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.city')}</label>
              <select value={profForm.ville} onChange={(e) => setProfForm({ ...profForm, ville: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">—</option>
                {SOUSS_MASSA_CITIES.map((c) => <option key={c} value={c}>{cityLabel(t, c)}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={savingProfile}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
            {savingProfile ? t('company.register.submitting') : t('company.completeProfile.submit')}
          </button>
        </form>
      </>
    );
  }

  if (profile.statut === 'en_attente') {
    return shell(
      <>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">⏳</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('company.pending.title')}</h2>
          <p className="text-gray-600">{t('company.pending.text')}</p>
        </div>
      </>
    );
  }

  if (profile.statut === 'refuse') {
    return shell(
      <>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('company.refused.title')}</h2>
          <p className="text-gray-600">{t('company.refused.text')}</p>
        </div>
      </>
    );
  }

  return shell(
    <>
      {/* Formulaire de dépôt */}
      <form onSubmit={submitOffer} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 mb-10">
        <h2 className="text-lg font-bold text-gray-900">{t('company.post.title')}</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.post.jobTitle')} *</label>
          <input type="text" required value={form.emploi_metier} onChange={(e) => setForm({ ...form, emploi_metier: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.city')} *</label>
            <select required value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">—</option>
              {SOUSS_MASSA_CITIES.map((c) => <option key={c} value={c}>{cityLabel(t, c)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('job.contractType')}</label>
            <select value={form.type_contrat} onChange={(e) => setForm({ ...form, type_contrat: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
              {CONTRACTS.map((c) => <option key={c} value={c}>{contractLong(t, c)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.post.positions')}</label>
            <input type="number" min={1} value={form.nbre_postes} onChange={(e) => setForm({ ...form, nbre_postes: Number(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.post.salary')}</label>
          <input type="text" value={form.suggested_salary_range} onChange={(e) => setForm({ ...form, suggested_salary_range: e.target.value })}
            placeholder={t('company.post.salaryHint')}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.post.description')} *</label>
          <textarea required rows={5} value={form.full_description} onChange={(e) => setForm({ ...form, full_description: e.target.value })}
            placeholder={t('company.post.descriptionPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.post.skills')}</label>
          <input type="text" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })}
            placeholder={t('company.post.skillsHint')}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button type="submit" disabled={sending}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors disabled:opacity-60">
          {sending ? t('company.post.submitting') : t('company.post.submit')}
        </button>
      </form>

      {/* Mes offres */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">{t('company.myOffers.title', { count: offers.length })}</h2>
      {offers.length === 0 ? (
        <p className="text-gray-500 text-sm bg-white rounded-xl border border-gray-200 p-6 text-center">{t('company.myOffers.empty')}</p>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{o.emploi_metier}</p>
                <p className="text-sm text-gray-500">{cityLabel(t, o.ville)} · {contractLong(t, o.type_contrat)} · {new Date(o.date_offre).toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR')}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[o.statut] || 'bg-gray-100 text-gray-700'}`}>
                {t(`company.status.${o.statut}`)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default CompanyDashboard;
