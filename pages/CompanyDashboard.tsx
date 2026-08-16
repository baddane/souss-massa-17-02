import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';
import { useT, cityLabel, contractLong } from '../src/i18n/LanguageContext';
import { SOUSS_MASSA_CITIES } from '../constants';
import { companyAuth, companyService, CompanyProfile, CandidatureRow, CandidatureStatus, CANDIDATURE_STATUSES, candidatureStatusKey } from '../src/services/companyService';
import { cvthequeService } from '../src/services/cvthequeService';
import CvthequeExplorer from '../components/CvthequeExplorer';

type Tab = 'offres' | 'candidatures' | 'cvtheque' | 'compte';

const CONTRACTS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
const STATUS_STYLE: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  refuse: 'bg-red-100 text-red-700',
  retire: 'bg-gray-200 text-gray-700',
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
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [tab, setTab] = useState<Tab>('offres');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [offerStep, setOfferStep] = useState<1 | 2>(1);
  const [candSearch, setCandSearch] = useState('');
  const [candStatus, setCandStatus] = useState<'tous' | CandidatureStatus>('tous');
  const [candPage, setCandPage] = useState(1);
  const [candidatures, setCandidatures] = useState<CandidatureRow[]>([]);
  const [loadingCand, setLoadingCand] = useState(false);

  // Ouvre un fichier du stockage privé via une URL signée (~120 s).
  const openFile = async (path: string | null, bucket: string) => {
    if (!path) return;
    const url = await cvthequeService.signedUrl(path, bucket);
    if (url) window.open(url, '_blank', 'noopener');
    else toast.error(t('company.cv.downloadError'));
  };

  const loadCandidatures = async (companyId: string) => {
    setLoadingCand(true);
    setCandidatures(await companyService.getMyCandidatures(companyId));
    setLoadingCand(false);
  };

  useEffect(() => {
    (async () => {
      const user = await companyAuth.currentUser();
      if (!user) { navigate('/connexion-entreprise'); return; }
      setAccount({ id: user.id, email: user.email || '' });
      const prof = await companyService.getProfile(user.id);
      setProfile(prof);
      if (prof && prof.statut === 'valide') {
        // Ville pre-remplie depuis le profil : un champ de moins a saisir.
        if (prof.ville) setForm((f) => ({ ...f, ville: prof.ville as string }));
        setOffers(await companyService.getMyOffers(user.id));
        loadCandidatures(user.id);
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

  // Remplace le mot de passe reçu par email par un mot de passe choisi.
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.password.length < 8) { toast.warning(t('company.error.passwordShort')); return; }
    if (pwForm.password !== pwForm.confirm) { toast.warning(t('company.error.passwordMismatch')); return; }
    setSavingPw(true);
    try {
      await companyAuth.changePassword(pwForm.password);
      setPwForm({ password: '', confirm: '' });
      toast.success(t('company.password.success'));
    } catch {
      toast.error(t('company.error.generic'));
    } finally {
      setSavingPw(false);
    }
  };

  // Charge une offre existante dans le formulaire (mode édition).
  const startEdit = (o: any) => {
    setEditingId(o.id);
    setForm({
      emploi_metier: o.emploi_metier || '',
      ville: o.ville || '',
      type_contrat: o.type_contrat || 'CDI',
      nbre_postes: o.nbre_postes || 1,
      suggested_salary_range: o.suggested_salary_range || '',
      full_description: o.full_description || '',
      skills: (o.required_skills || []).join(', '),
    });
    setTab('offres');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setOfferStep(1);
    setForm({ ...emptyForm, ville: profile?.ville || '' });
  };

  // Suivi d'une candidature (à traiter / présélection / entretien / refusée).
  const setCandidatureStatus = async (c: CandidatureRow, status: CandidatureStatus) => {
    const previous = c.status;
    // Optimiste : la liste réagit tout de suite, on revient en arrière si la base refuse.
    setCandidatures((prev) => prev.map((x) => (x.id === c.id ? { ...x, status } : x)));
    try {
      await companyService.setCandidatureStatus(c.id, status);
    } catch {
      setCandidatures((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: previous } : x)));
      toast.error(t('company.error.generic'));
    }
  };

  // Compteurs affichés en tête de tableau de bord.
  const stats = {
    publiees: offers.filter((o) => o.statut === 'active').length,
    enAttente: offers.filter((o) => o.statut === 'en_attente').length,
    candidatures: candidatures.length,
    nouvelles: candidatures.filter((c) => (c.status || 'nouvelle') === 'nouvelle').length,
  };

  // Filtrage + pagination des candidatures.
  const PER_PAGE = 10;
  const filteredCand = candidatures.filter((c) => {
    if (candStatus !== 'tous' && (c.status || 'nouvelle') !== candStatus) return false;
    const q = candSearch.trim().toLowerCase();
    if (!q) return true;
    return [c.candidate_name, c.candidate_email, c.job_title].some((v) => (v || '').toLowerCase().includes(q));
  });
  const candPages = Math.max(1, Math.ceil(filteredCand.length / PER_PAGE));
  const pageSafe = Math.min(candPage, candPages);
  const pagedCand = filteredCand.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE);
  // Memes couleurs que la page admin, pour que le meme statut se lise pareil.
  const CAND_STYLE: Record<string, string> = {
    'nouvelle': 'bg-blue-100 text-blue-800',
    'vue': 'bg-gray-100 text-gray-800',
    'présélection': 'bg-yellow-100 text-yellow-800',
    'entretien': 'bg-purple-100 text-purple-800',
    'acceptée': 'bg-green-100 text-green-800',
    'refusée': 'bg-red-100 text-red-800',
  };

  // Retrait / remise en validation d'une offre.
  const changeOfferStatus = async (o: any, statut: 'retire' | 'en_attente') => {
    if (statut === 'retire' && !confirm(t('company.offer.withdrawConfirm'))) return;
    try {
      await companyService.setMyOfferStatus(o.id, statut);
      if (profile) setOffers(await companyService.getMyOffers(profile.id));
      toast.success(statut === 'retire' ? t('company.offer.withdrawn') : t('company.offer.resubmitted'));
    } catch {
      toast.error(t('company.error.generic'));
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
      const payload = {
        emploi_metier: form.emploi_metier,
        ville: form.ville,
        type_contrat: form.type_contrat,
        nbre_postes: Number(form.nbre_postes) || 1,
        suggested_salary_range: form.suggested_salary_range,
        full_description: form.full_description,
        required_skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editingId) {
        await companyService.updateOffer(editingId, profile, payload);
        toast.success(t('company.offer.updated'));
      } else {
        await companyService.createOffer(profile, payload);
        toast.success(t('company.post.success'));
      }
      setEditingId(null);
      setOfferStep(1);
      setForm({ ...emptyForm, ville: profile.ville || '' });
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
    // La CVthèque s'affiche bord à bord : lire un CV demande de la surface, et
    // une largeur maximale centrée gaspillait la moitié de l'écran. Les autres
    // onglets gardent leur colonne de lecture, adaptée aux formulaires.
    <div className={`${tab === 'cvtheque' ? 'w-full px-3 sm:px-5' : 'max-w-4xl mx-auto px-4'} py-10`}>
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

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'offres', label: t('company.tab.offers'), badge: offers.length },
    { key: 'candidatures', label: t('company.tab.applications'), badge: candidatures.length },
    { key: 'cvtheque', label: t('company.tab.cvtheque') },
    { key: 'compte', label: t('company.tab.account') },
  ];

  return shell(
    <>
      {/* Situation en un coup d'œil, avant le détail */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden mb-8">
        {[
          { n: stats.publiees, l: t('company.stat.published') },
          { n: stats.enAttente, l: t('company.stat.pending') },
          { n: stats.candidatures, l: t('company.stat.applications') },
          { n: stats.nouvelles, l: t('company.stat.newApplications'), accent: stats.nouvelles > 0 },
        ].map((s, i) => (
          <div key={i} className="bg-white px-4 py-4">
            <p className={`text-2xl font-bold tabular-nums ${s.accent ? 'text-blue-600' : 'text-gray-900'}`}>{s.n}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      {stats.nouvelles > 0 && (
        <button onClick={() => { setTab('candidatures'); setCandStatus('nouvelle'); setCandPage(1); }}
          className="w-full text-start bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-8 text-sm text-blue-900 hover:bg-blue-100 transition-colors">
          {t('company.stat.newApplicationsCta', { count: stats.nouvelles })}
        </button>
      )}

      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-8">
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`px-4 py-2.5 -mb-px border-b-2 text-sm font-semibold transition-colors ${
              tab === tb.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {tb.label}{typeof tb.badge === 'number' && tb.badge > 0 ? ` (${tb.badge})` : ''}
          </button>
        ))}
      </div>

      {tab === 'offres' && (
      <>
      {/* Formulaire de dépôt */}
      <form onSubmit={submitOffer} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 mb-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">{editingId ? t('company.offer.editTitle') : t('company.post.title')}</h2>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="text-sm text-gray-500 hover:text-gray-800 font-medium">
              {t('company.offer.cancelEdit')}
            </button>
          )}
        </div>
        {editingId && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{t('company.offer.editWarning')}</p>}

        {/* Depot en deux temps : le poste, puis le detail. Moins intimidant qu'un
            bloc de sept champs, et l'etape 1 suffit a decrire l'essentiel. */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className={offerStep === 1 ? 'text-blue-600' : 'text-gray-400'}>1. {t('company.post.step1')}</span>
          <span className="h-px flex-1 bg-gray-200" />
          <span className={offerStep === 2 ? 'text-blue-600' : 'text-gray-400'}>2. {t('company.post.step2')}</span>
        </div>

        <div className={offerStep === 1 ? '' : 'hidden'}>
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
        <button type="button"
          onClick={() => {
            if (!form.emploi_metier || !form.ville) { toast.warning(t('company.error.fillRequired')); return; }
            setOfferStep(2);
          }}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors">
          {t('company.post.next')}
        </button>
        </div>

        <div className={offerStep === 2 ? '' : 'hidden'}>
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
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => setOfferStep(1)}
            className="sm:w-40 border border-gray-200 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            {t('company.post.back')}
          </button>
          <button type="submit" disabled={sending}
            className="flex-1 bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors disabled:opacity-60">
            {sending ? t('company.post.submitting') : editingId ? t('company.offer.saveEdit') : t('company.post.submit')}
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center">{t('company.post.reviewDelay')}</p>
        </div>
      </form>

      {/* Mes offres */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">{t('company.myOffers.title', { count: offers.length })}</h2>
      {offers.length === 0 ? (
        <p className="text-gray-500 text-sm bg-white rounded-xl border border-gray-200 p-6 text-center">{t('company.myOffers.empty')}</p>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{o.emploi_metier}</p>
                <p className="text-sm text-gray-500">{cityLabel(t, o.ville)} · {contractLong(t, o.type_contrat)} · {new Date(o.date_offre).toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR')}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[o.statut] || 'bg-gray-100 text-gray-700'}`}>
                  {t(`company.status.${o.statut}`)}
                </span>
                <button onClick={() => startEdit(o)}
                  className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  {t('company.offer.edit')}
                </button>
                {o.statut === 'retire' ? (
                  <button onClick={() => changeOfferStatus(o, 'en_attente')}
                    className="px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50">
                    {t('company.offer.resubmit')}
                  </button>
                ) : (
                  <button onClick={() => changeOfferStatus(o, 'retire')}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                    {t('company.offer.withdraw')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* Candidatures reçues sur mes offres */}
      {tab === 'candidatures' && (
        loadingCand ? <p className="text-gray-500 text-sm">{t('company.loading')}</p> :
        candidatures.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white rounded-xl border border-gray-200 p-6 text-center">{t('company.applications.empty')}</p>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="search" value={candSearch}
                onChange={(e) => { setCandSearch(e.target.value); setCandPage(1); }}
                placeholder={t('company.applications.searchHint')}
                className="sm:col-span-2 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
              <select value={candStatus}
                onChange={(e) => { setCandStatus(e.target.value as typeof candStatus); setCandPage(1); }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="tous">{t('company.applications.allStatuses')}</option>
                {CANDIDATURE_STATUSES.map((st) => <option key={st} value={st}>{t(`company.cand.${candidatureStatusKey(st)}`)}</option>)}
              </select>
            </div>

            <p className="text-sm text-gray-500 mb-3">{t('company.applications.count', { count: filteredCand.length })}</p>

            {filteredCand.length === 0 ? (
              <p className="text-gray-500 text-sm bg-white rounded-xl border border-gray-200 p-6 text-center">{t('company.applications.noMatch')}</p>
            ) : (
              <div className="space-y-3">
                {pagedCand.map((c) => (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.candidate_name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {c.job_title} · {new Date(c.created_at).toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR')}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        <a href={`mailto:${c.candidate_email}`} className="text-blue-600 hover:underline">{c.candidate_email}</a>
                        {c.candidate_phone ? ` · ${c.candidate_phone}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${CAND_STYLE[c.status || 'nouvelle'] || 'bg-gray-100 text-gray-700'}`}>
                        {t(`company.cand.${candidatureStatusKey(c.status || 'nouvelle')}`)}
                      </span>
                      <select value={c.status || 'nouvelle'}
                        onChange={(e) => setCandidatureStatus(c, e.target.value as CandidatureStatus)}
                        aria-label={t('company.applications.changeStatus')}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        {CANDIDATURE_STATUSES.map((st) => <option key={st} value={st}>{t(`company.cand.${candidatureStatusKey(st)}`)}</option>)}
                      </select>
                      {c.cv_path ? (
                        <button onClick={() => openFile(c.cv_path, 'cvs')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 whitespace-nowrap">
                          {t('company.cv.download')}
                        </button>
                      ) : <span className="text-xs text-gray-400">{t('company.cv.none')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {candPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button onClick={() => setCandPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50">
                  {t('offers.previous')}
                </button>
                <span className="text-sm text-gray-500 tabular-nums">{t('offers.page', { page: pageSafe, total: candPages })}</span>
                <button onClick={() => setCandPage((p) => Math.min(candPages, p + 1))} disabled={pageSafe >= candPages}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50">
                  {t('offers.next')}
                </button>
              </div>
            )}
          </>
        )
      )}

      {/* CVthèque — composant partagé avec l'admin, pour un affichage identique */}
      {tab === 'cvtheque' && <CvthequeExplorer />}

      {/* Mon compte — remplacer le mot de passe reçu par email */}
      {tab === 'compte' && (
      <form onSubmit={changePassword} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 max-w-lg">
        <h2 className="text-lg font-bold text-gray-900">{t('company.password.title')}</h2>
        <p className="text-sm text-gray-500">{t('company.password.subtitle')}</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.password.new')} *</label>
          <input type="password" required minLength={8} value={pwForm.password} autoComplete="new-password"
            onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
          <p className="text-xs text-gray-400 mt-1">{t('company.passwordHint')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('company.confirmPassword')} *</label>
          <input type="password" required value={pwForm.confirm} autoComplete="new-password"
            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button type="submit" disabled={savingPw}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
          {savingPw ? t('company.password.saving') : t('company.password.submit')}
        </button>
      </form>
      )}
    </>
  );
};

export default CompanyDashboard;
