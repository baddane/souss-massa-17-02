import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabaseOffers } from '../src/services/supabase';
import { moderationService, CompanyProfile } from '../src/services/companyService';
import { slugify } from '../components/SEO';
import { SOUSS_MASSA_CITIES } from '../constants';

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
const emptyOfferForm = {
  emploi_metier: '', raison_sociale: '', ville: 'Agadir', type_contrat: 'CDI',
  nbre_postes: 1, date_offre: new Date().toISOString().split('T')[0], ref_offre: '',
  suggested_salary_range: '', full_description: '', required_skills: '',
  meta_description: '', seo_keywords: '', slug: '', source: 'Direct',
};
const splitList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

const COMPANY_STATUT_LABEL: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  valide: { label: 'Validé', color: 'bg-green-100 text-green-800' },
  refuse: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
};

const STATUS_OPTIONS = [
  { value: 'nouvelle', label: 'Nouvelle', color: 'bg-blue-100 text-blue-800' },
  { value: 'vue', label: 'Vue', color: 'bg-gray-100 text-gray-800' },
  { value: 'présélection', label: 'Présélection', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'entretien', label: 'Entretien', color: 'bg-purple-100 text-purple-800' },
  { value: 'acceptée', label: 'Acceptée', color: 'bg-green-100 text-green-800' },
  { value: 'refusée', label: 'Refusée', color: 'bg-red-100 text-red-800' },
];

function getStatusStyle(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-700';
}

interface Candidature {
  id: string;
  created_at: string;
  job_ref: string;
  job_title: string;
  company_name: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string | null;
  cv_url: string | null;
  cv_path: string | null;
  cv_filename: string | null;
  status: string;
  notes: string | null;
}

interface Message {
  id: string;
  created_at: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  subject: string;
  body: string;
  is_read: boolean;
}

const Admin: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'candidatures' | 'messages' | 'entreprises' | 'offres' | 'nouvelle' | 'compte'>('candidatures');
  const [acctEmail, setAcctEmail] = useState('');
  const [acctPwd, setAcctPwd] = useState('');
  const [savingAcct, setSavingAcct] = useState(false);
  const [offerForm, setOfferForm] = useState({ ...emptyOfferForm });
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ slug: string } | null>(null);
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [pendingOffers, setPendingOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [search, setSearch] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  // Verifie une session admin existante (Supabase Auth + appartenance app_admins)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabaseOffers.auth.getSession();
      if (session) {
        const { data: isAdmin } = await supabaseOffers.rpc('is_admin');
        if (isAdmin) setAuthed(true);
        else await supabaseOffers.auth.signOut();
      }
      setAuthChecking(false);
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const { error } = await supabaseOffers.auth.signInWithPassword({ email: loginEmail.trim(), password });
      if (error) throw error;
      const { data: isAdmin } = await supabaseOffers.rpc('is_admin');
      if (!isAdmin) {
        await supabaseOffers.auth.signOut();
        alert("Ce compte n'est pas administrateur.");
        return;
      }
      setAuthed(true);
    } catch {
      alert('Identifiants incorrects.');
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = async () => {
    await supabaseOffers.auth.signOut();
    setAuthed(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (acctPwd.length < 8) { alert('Le mot de passe doit faire au moins 8 caractères.'); return; }
    setSavingAcct(true);
    const { error } = await supabaseOffers.auth.updateUser({ password: acctPwd });
    setSavingAcct(false);
    if (error) { alert('Erreur : ' + error.message); return; }
    setAcctPwd('');
    alert('Mot de passe mis à jour ✅');
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acctEmail.includes('@')) { alert('Email invalide.'); return; }
    setSavingAcct(true);
    const { error } = await supabaseOffers.auth.updateUser({ email: acctEmail.trim() });
    setSavingAcct(false);
    if (error) { alert('Erreur : ' + error.message); return; }
    alert("Un email de confirmation a été envoyé à la NOUVELLE adresse. L'identifiant ne changera qu'une fois ce lien validé.");
    setAcctEmail('');
  };

  const openCv = async (c: Candidature) => {
    const path = c.cv_path || (c.cv_url ? c.cv_url.replace(/^.*\/cvs\//, '') : '');
    if (!path) { alert('CV indisponible.'); return; }
    const { data, error } = await supabaseOffers.storage.from('cvs').createSignedUrl(path, 120);
    if (error || !data) { alert('Impossible de générer le lien du CV.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  useEffect(() => {
    if (!authed) return;
    loadCandidatures();
    loadMessages();
    loadCompanies();
    loadPendingOffers();
  }, [authed]);

  const loadCompanies = async () => {
    setCompanies(await moderationService.getCompanies());
  };

  const loadPendingOffers = async () => {
    setPendingOffers(await moderationService.getPendingOffers());
  };

  const validateCompany = async (c: CompanyProfile) => {
    try {
      await moderationService.setCompanyStatus(c.id, 'valide');
      // Notification email (rappel identifiants)
      try {
        await fetch('/api/notify-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: c.email }),
        });
        await moderationService.markNotified(c.id);
      } catch (e) {
        console.warn('Email de validation non envoyé:', e);
      }
      setCompanies(prev => prev.map(x => x.id === c.id ? { ...x, statut: 'valide', notified: true } : x));
    } catch (e) {
      alert("Erreur lors de la validation.");
    }
  };

  const refuseCompany = async (id: string) => {
    if (!confirm('Refuser cette entreprise ?')) return;
    await moderationService.setCompanyStatus(id, 'refuse');
    setCompanies(prev => prev.map(x => x.id === id ? { ...x, statut: 'refuse' } : x));
  };

  const validateOffer = async (id: string) => {
    await moderationService.setOfferStatus(id, 'active');
    setPendingOffers(prev => prev.filter(o => o.id !== id));
  };

  const setOffer = (k: string, v: string | number) => setOfferForm(f => ({ ...f, [k]: v }));

  const createOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerForm.emploi_metier || !offerForm.raison_sociale || !offerForm.ville || !offerForm.full_description) {
      alert('Intitulé, entreprise, ville et description sont obligatoires.');
      return;
    }
    setCreatingOffer(true);
    try {
      const today = /^\d{4}-\d{2}-\d{2}$/.test(offerForm.date_offre) ? offerForm.date_offre : new Date().toISOString().split('T')[0];
      let slug = offerForm.slug.trim() || slugify(`${offerForm.emploi_metier}-${offerForm.ville}`);
      const { data: ex } = await supabaseOffers.from('job_offers').select('slug').eq('slug', slug).maybeSingle();
      if (ex) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      const record = {
        id: `adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ville: offerForm.ville,
        ref_offre: offerForm.ref_offre.trim() || `DIR-${today.replace(/-/g, '').slice(2)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        type_contrat: offerForm.type_contrat,
        raison_sociale: offerForm.raison_sociale,
        date_offre: today,
        nbre_postes: Number(offerForm.nbre_postes) || 1,
        emploi_metier: offerForm.emploi_metier,
        full_description: offerForm.full_description,
        required_skills: splitList(offerForm.required_skills),
        suggested_salary_range: offerForm.suggested_salary_range || null,
        meta_description: (offerForm.meta_description || `${offerForm.emploi_metier} à ${offerForm.ville} - ${offerForm.type_contrat} chez ${offerForm.raison_sociale}.`).slice(0, 160),
        seo_keywords: offerForm.seo_keywords ? splitList(offerForm.seo_keywords) : [`emploi ${offerForm.ville.toLowerCase()}`, `${offerForm.emploi_metier.toLowerCase()} maroc`, 'recrutement souss-massa'],
        source: offerForm.source || 'Direct',
        slug,
        statut: 'active',
        is_featured: false,
      };
      const { error } = await supabaseOffers.from('job_offers').insert(record);
      if (error) throw error;
      setLastCreated({ slug });
      setOfferForm({ ...emptyOfferForm });
    } catch (err: any) {
      alert('Erreur lors de la publication : ' + (err?.message || err));
    } finally {
      setCreatingOffer(false);
    }
  };

  const refuseOffer = async (id: string) => {
    if (!confirm('Refuser cette offre ?')) return;
    await moderationService.setOfferStatus(id, 'refuse');
    setPendingOffers(prev => prev.filter(o => o.id !== id));
  };

  const loadCandidatures = async () => {
    setLoading(true);
    const { data, error } = await supabaseOffers
      .from('candidatures')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement candidatures:', error);
    } else {
      setCandidatures(data || []);
    }
    setLoading(false);
  };

  const loadMessages = async () => {
    setMessagesLoading(true);
    const { data, error } = await supabaseOffers
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement messages:', error);
    } else {
      setMessages(data || []);
    }
    setMessagesLoading(false);
  };

  const toggleMessageRead = async (id: string, currentRead: boolean) => {
    const { error } = await supabaseOffers
      .from('messages')
      .update({ is_read: !currentRead })
      .eq('id', id);

    if (!error) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: !currentRead } : m));
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    const { error } = await supabaseOffers
      .from('messages')
      .delete()
      .eq('id', id);

    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== id));
      if (expandedMessage === id) setExpandedMessage(null);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabaseOffers
      .from('candidatures')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setCandidatures(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    }
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabaseOffers
      .from('candidatures')
      .update({ notes: notesValue })
      .eq('id', id);

    if (!error) {
      setCandidatures(prev => prev.map(c => c.id === id ? { ...c, notes: notesValue } : c));
      setEditingNotes(null);
    }
  };

  const deleteCandidature = async (id: string) => {
    if (!confirm('Supprimer cette candidature ?')) return;
    const { error } = await supabaseOffers
      .from('candidatures')
      .delete()
      .eq('id', id);

    if (!error) {
      setCandidatures(prev => prev.filter(c => c.id !== id));
    }
  };

  const jobTitles = useMemo(() => {
    const titles = new Set(candidatures.map(c => c.job_title));
    return Array.from(titles).sort();
  }, [candidatures]);

  const filtered = useMemo(() => {
    return candidatures.filter(c => {
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterJob && c.job_title !== filterJob) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.candidate_name.toLowerCase().includes(q) ||
               c.candidate_email.toLowerCase().includes(q) ||
               (c.candidate_phone || '').includes(q);
      }
      return true;
    });
  }, [candidatures, filterStatus, filterJob, search]);

  const stats = useMemo(() => {
    const total = candidatures.length;
    const nouvelle = candidatures.filter(c => c.status === 'nouvelle').length;
    const preselection = candidatures.filter(c => c.status === 'présélection').length;
    const entretien = candidatures.filter(c => c.status === 'entretien').length;
    return { total, nouvelle, preselection, entretien };
  }, [candidatures]);

  if (authChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-gray-900 text-center">Administration</h1>
          <p className="text-sm text-gray-500 text-center">Accès réservé au recruteur</p>
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="Email administrateur"
            autoComplete="username"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loggingIn ? 'Connexion…' : 'Accéder'}
          </button>
        </form>
      </div>
    );
  }

  const unreadMessages = messages.filter(m => !m.is_read).length;
  const pendingCompanies = companies.filter(c => c.statut === 'en_attente').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez les candidatures et messages</p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={() => { loadCandidatures(); loadMessages(); loadCompanies(); loadPendingOffers(); }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            Rafraîchir
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('candidatures')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'candidatures'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Candidatures ({candidatures.length})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors relative ${
            activeTab === 'messages'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Messages ({messages.length})
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {unreadMessages}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('entreprises')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors relative ${
            activeTab === 'entreprises' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Entreprises ({companies.length})
          {pendingCompanies > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {pendingCompanies}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('offres')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors relative ${
            activeTab === 'offres' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Offres à valider ({pendingOffers.length})
          {pendingOffers.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {pendingOffers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('nouvelle')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'nouvelle' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          + Nouvelle offre
        </button>
        <button
          onClick={() => setActiveTab('compte')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'compte' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Mon compte
        </button>
      </div>

      {activeTab === 'candidatures' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
              <p className="text-2xl font-bold text-blue-700">{stats.nouvelle}</p>
              <p className="text-xs text-blue-600">Nouvelles</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-center">
              <p className="text-2xl font-bold text-yellow-700">{stats.preselection}</p>
              <p className="text-xs text-yellow-600">Présélection</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-center">
              <p className="text-2xl font-bold text-purple-700">{stats.entretien}</p>
              <p className="text-xs text-purple-600">Entretien</p>
            </div>
          </div>

          {/* Filtres */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 flex flex-col md:flex-row gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un candidat…"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les postes</option>
              {jobTitles.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Liste */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">Aucune candidature trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{c.candidate_name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusStyle(c.status)}`}>
                          {STATUS_OPTIONS.find(s => s.value === c.status)?.label || c.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-2">
                        <a href={`mailto:${c.candidate_email}`} className="text-blue-600 hover:underline">{c.candidate_email}</a>
                        {c.candidate_phone && (
                          <a href={`tel:${c.candidate_phone}`} className="text-blue-600 hover:underline">{c.candidate_phone}</a>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{c.job_title}</span>
                        <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded">{c.company_name}</span>
                        <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded">Réf : {c.job_ref}</span>
                        <span className="text-gray-400">
                          {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="mt-3">
                        {editingNotes === c.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              placeholder="Ajouter une note…"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              autoFocus
                            />
                            <button onClick={() => saveNotes(c.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">OK</button>
                            <button onClick={() => setEditingNotes(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm">Annuler</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingNotes(c.id); setNotesValue(c.notes || ''); }}
                            className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            {c.notes ? `Note : ${c.notes}` : '+ Ajouter une note'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">
                      {(c.cv_path || c.cv_url) && (
                        <button
                          onClick={() => openCv(c)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors text-center"
                        >
                          CV {c.cv_filename?.split('.').pop()?.toUpperCase()}
                        </button>
                      )}
                      <select
                        value={c.status}
                        onChange={(e) => updateStatus(c.id, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteCandidature(c.id)}
                        className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-8">
            {filtered.length} candidature{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {activeTab === 'messages' && (
        <>
          {messagesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">Aucun message reçu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`bg-white rounded-xl border p-5 transition-colors cursor-pointer ${
                    m.is_read ? 'border-gray-200' : 'border-blue-300 bg-blue-50/30'
                  }`}
                  onClick={() => {
                    setExpandedMessage(expandedMessage === m.id ? null : m.id);
                    if (!m.is_read) toggleMessageRead(m.id, false);
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        {!m.is_read && (
                          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                        <h3 className={`font-bold text-gray-900 ${!m.is_read ? 'text-blue-900' : ''}`}>{m.sender_name}</h3>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{m.subject}</span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-1">
                        <a href={`mailto:${m.sender_email}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{m.sender_email}</a>
                        {m.sender_phone && (
                          <a href={`tel:${m.sender_phone}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{m.sender_phone}</a>
                        )}
                        <span className="text-gray-400 text-xs">
                          {new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {expandedMessage === m.id ? (
                        <p className="text-gray-700 text-sm mt-3 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{m.body}</p>
                      ) : (
                        <p className="text-gray-500 text-sm truncate mt-1">{m.body}</p>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleMessageRead(m.id, m.is_read)}
                        className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-xs transition-colors"
                      >
                        {m.is_read ? 'Non lu' : 'Lu'}
                      </button>
                      <button
                        onClick={() => deleteMessage(m.id)}
                        className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-8">
            {messages.length} message{messages.length !== 1 ? 's' : ''} · {unreadMessages} non lu{unreadMessages !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {activeTab === 'entreprises' && (
        <>
          {companies.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">Aucune entreprise inscrite</p>
            </div>
          ) : (
            <div className="space-y-3">
              {companies.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg">{c.nom_entreprise}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${COMPANY_STATUT_LABEL[c.statut]?.color || ''}`}>
                          {COMPANY_STATUT_LABEL[c.statut]?.label || c.statut}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">{c.email}</a>
                        {c.telephone && <a href={`tel:${c.telephone}`} className="text-blue-600 hover:underline">{c.telephone}</a>}
                        {c.ville && <span className="text-gray-500">{c.ville}</span>}
                        {c.secteur && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{c.secteur}</span>}
                        <span className="text-gray-400 text-xs">
                          {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {c.statut === 'en_attente' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => validateCompany(c)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                          Valider
                        </button>
                        <button onClick={() => refuseCompany(c.id)} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium">
                          Refuser
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'offres' && (
        <>
          {pendingOffers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">Aucune offre en attente de validation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOffers.map((o) => (
                <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-blue-800 text-lg">{o.emploi_metier}</h3>
                      <p className="text-gray-700 font-medium text-sm">{o.raison_sociale}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{o.type_contrat}</span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{o.ville}</span>
                        {o.suggested_salary_range && <span className="bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded">{o.suggested_salary_range}</span>}
                        <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded">Réf : {o.ref_offre}</span>
                      </div>
                      <p className="text-gray-600 text-sm mt-3 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{o.full_description}</p>
                      {o.required_skills && o.required_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {o.required_skills.map((s: string, i: number) => (
                            <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">
                      <button onClick={() => validateOffer(o.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                        Valider
                      </button>
                      <button onClick={() => refuseOffer(o.id)} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium">
                        Refuser
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'nouvelle' && (
        <form onSubmit={createOffer} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 max-w-3xl">
          {lastCreated && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
              <span className="text-green-800 font-medium">Offre publiée ✅ </span>
              <a href={`/emploi/${lastCreated.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                /emploi/{lastCreated.slug}
              </a>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intitulé du poste *</label>
              <input type="text" value={offerForm.emploi_metier} onChange={(e) => setOffer('emploi_metier', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise *</label>
              <input type="text" value={offerForm.raison_sociale} onChange={(e) => setOffer('raison_sociale', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
              <select value={offerForm.ville} onChange={(e) => setOffer('ville', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                {SOUSS_MASSA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
              <select value={offerForm.type_contrat} onChange={(e) => setOffer('type_contrat', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de postes</label>
              <input type="number" min={1} value={offerForm.nbre_postes} onChange={(e) => setOffer('nbre_postes', Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de publication</label>
              <input type="date" value={offerForm.date_offre} onChange={(e) => setOffer('date_offre', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Réf. offre <span className="text-gray-400">(auto)</span></label>
              <input type="text" value={offerForm.ref_offre} onChange={(e) => setOffer('ref_offre', e.target.value)} placeholder="DIR-…"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fourchette salariale</label>
              <input type="text" value={offerForm.suggested_salary_range} onChange={(e) => setOffer('suggested_salary_range', e.target.value)} placeholder="5000-8000 MAD"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description du poste *</label>
            <textarea rows={6} value={offerForm.full_description} onChange={(e) => setOffer('full_description', e.target.value)}
              placeholder="Missions, profil recherché, avantages…"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compétences requises</label>
            <input type="text" value={offerForm.required_skills} onChange={(e) => setOffer('required_skills', e.target.value)}
              placeholder="JavaScript, React, SQL (séparées par des virgules)"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>

          {/* Section SEO */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Référencement (SEO)</h3>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Meta description</label>
                <span className={`text-xs ${offerForm.meta_description.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                  {offerForm.meta_description.length}/160
                </span>
              </div>
              <textarea rows={2} value={offerForm.meta_description} onChange={(e) => setOffer('meta_description', e.target.value)}
                placeholder="Résumé SEO (max 160 caractères). Laissé vide = généré automatiquement."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés SEO</label>
              <input type="text" value={offerForm.seo_keywords} onChange={(e) => setOffer('seo_keywords', e.target.value)}
                placeholder="emploi agadir, développeur maroc, … (séparés par des virgules)"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug <span className="text-gray-400">(auto)</span></label>
                <input type="text" value={offerForm.slug} onChange={(e) => setOffer('slug', e.target.value)} placeholder="intitule-ville"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input type="text" value={offerForm.source} onChange={(e) => setOffer('source', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={creatingOffer}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
            {creatingOffer ? 'Publication…' : "Publier l'offre"}
          </button>
          <p className="text-xs text-gray-400 text-center">
            L'offre est publiée immédiatement (statut « active ») et visible sur le site. Pensez à régénérer la sitemap.
          </p>
        </form>
      )}

      {activeTab === 'compte' && (
        <div className="max-w-md space-y-6">
          <form onSubmit={changePassword} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Changer le mot de passe</h3>
            <input
              type="password"
              value={acctPwd}
              onChange={(e) => setAcctPwd(e.target.value)}
              placeholder="Nouveau mot de passe (8 caractères min.)"
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <button type="submit" disabled={savingAcct}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
              {savingAcct ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
            </button>
          </form>

          <form onSubmit={changeEmail} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Changer l'email (identifiant)</h3>
            <input
              type="email"
              value={acctEmail}
              onChange={(e) => setAcctEmail(e.target.value)}
              placeholder="nouvelle@adresse.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <p className="text-xs text-gray-400">
              Utilise une vraie adresse : un lien de confirmation y sera envoyé. L'identifiant ne change qu'après validation de ce lien.
            </p>
            <button type="submit" disabled={savingAcct}
              className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-900 transition-colors disabled:opacity-60">
              {savingAcct ? 'Envoi…' : "Changer l'email"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Admin;
