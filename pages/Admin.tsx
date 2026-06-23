import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabaseOffers } from '../src/services/supabase';
import { slugify } from '../components/SEO';

const ADMIN_PASSWORD = 'souss2026';
const SITE_URL = 'https://soussmassa-rh.com';

function generateWhatsAppUrl(offer: { emploi_metier: string; ville: string; type_contrat: string; raison_sociale: string; nbre_postes: number; slug: string }) {
  const postes = offer.nbre_postes > 1 ? `${offer.nbre_postes} postes` : '1 poste';
  const message = `🟢 *Nouvelle offre d'emploi*

📌 *${offer.emploi_metier}*
🏢 ${offer.raison_sociale}
📍 ${offer.ville}
📄 ${offer.type_contrat} — ${postes}

👉 Postulez ici : ${SITE_URL}/emploi/${offer.slug}

_Retrouvez toutes les offres sur ${SITE_URL}_`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

const SOUSS_MASSA_CITIES = ['Agadir', 'Inezgane', 'Taroudant', 'Tiznit', 'Ouarzazate', 'Chtouka Ait Baha', 'Tata'];
const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
const SOURCE_OPTIONS = ['Direct', 'ANAPEC'];

interface OfferForm {
  emploi_metier: string;
  ville: string;
  type_contrat: string;
  raison_sociale: string;
  date_offre: string;
  nbre_postes: number;
  ref_offre: string;
  full_description: string;
  meta_description: string;
  seo_keywords: string;
  required_skills: string;
  suggested_salary_range: string;
  source: string;
}

const EMPTY_OFFER_FORM: OfferForm = {
  emploi_metier: '',
  ville: 'Agadir',
  type_contrat: 'CDI',
  raison_sociale: '',
  date_offre: new Date().toISOString().split('T')[0],
  nbre_postes: 1,
  ref_offre: '',
  full_description: '',
  meta_description: '',
  seo_keywords: '',
  required_skills: '',
  suggested_salary_range: '',
  source: 'Direct',
};

interface JobOfferRow {
  id: string;
  created_at: string;
  ville: string;
  ref_offre: string;
  type_contrat: string;
  raison_sociale: string;
  date_offre: string;
  nbre_postes: number;
  emploi_metier: string;
  full_description: string;
  seo_keywords: string[];
  meta_description: string;
  suggested_salary_range: string | null;
  required_skills: string[];
  source: string;
  slug: string;
  statut?: string;
  is_featured?: boolean;
}

function generateRefOffre(entreprise: string): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const initiales = entreprise
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'XX';
  const num = String(Math.floor(Math.random() * 900) + 100);
  return `DIR-${dd}${mm}${yy}-${initiales}-${num}`;
}

async function generateUniqueSlug(poste: string, ville: string, entreprise: string, currentSlug?: string): Promise<string> {
  const base = slugify(`${poste} ${ville}`);
  const { data: existing } = await supabaseOffers
    .from('job_offers')
    .select('slug')
    .like('slug', `${base}%`);

  const slugs = new Set((existing || []).map((r: { slug: string }) => r.slug));
  if (currentSlug) slugs.delete(currentSlug);
  if (!slugs.has(base)) return base;

  const withCompany = slugify(`${poste} ${ville} ${entreprise}`);
  if (!slugs.has(withCompany)) return withCompany;

  let i = 2;
  while (slugs.has(`${withCompany}-${i}`)) i++;
  return `${withCompany}-${i}`;
}

function offerToForm(o: JobOfferRow): OfferForm {
  return {
    emploi_metier: o.emploi_metier,
    ville: o.ville,
    type_contrat: o.type_contrat,
    raison_sociale: o.raison_sociale,
    date_offre: o.date_offre,
    nbre_postes: o.nbre_postes,
    ref_offre: o.ref_offre,
    full_description: o.full_description || '',
    meta_description: o.meta_description || '',
    seo_keywords: (o.seo_keywords || []).join(', '),
    required_skills: (o.required_skills || []).join(', '),
    suggested_salary_range: o.suggested_salary_range || '',
    source: o.source || 'Direct',
  };
}

const CANDIDATURE_STATUS_OPTIONS = [
  { value: 'nouvelle', label: 'Nouvelle', color: 'bg-blue-100 text-blue-800' },
  { value: 'vue', label: 'Vue', color: 'bg-gray-100 text-gray-800' },
  { value: 'présélection', label: 'Présélection', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'entretien', label: 'Entretien', color: 'bg-purple-100 text-purple-800' },
  { value: 'acceptée', label: 'Acceptée', color: 'bg-green-100 text-green-800' },
  { value: 'refusée', label: 'Refusée', color: 'bg-red-100 text-red-800' },
];

function getStatusStyle(status: string) {
  return CANDIDATURE_STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-700';
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

// ── Shared form fields component ──
const OfferFormFields: React.FC<{
  form: OfferForm;
  onChange: <K extends keyof OfferForm>(field: K, value: OfferForm[K]) => void;
  refReadOnly?: boolean;
}> = ({ form, onChange, refReadOnly }) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Intitulé du poste *</label>
        <input type="text" value={form.emploi_metier} onChange={e => onChange('emploi_metier', e.target.value)}
          placeholder="Ex: Développeur Web, Comptable..." className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise *</label>
        <input type="text" value={form.raison_sociale} onChange={e => onChange('raison_sociale', e.target.value)}
          placeholder="Ex: SARL XYZ" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
        <select value={form.ville} onChange={e => onChange('ville', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          {SOUSS_MASSA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
        <select value={form.type_contrat} onChange={e => onChange('type_contrat', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
        <select value={form.source} onChange={e => onChange('source', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date de l'offre</label>
        <input type="date" value={form.date_offre} onChange={e => onChange('date_offre', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de postes</label>
        <input type="number" min={1} value={form.nbre_postes} onChange={e => onChange('nbre_postes', parseInt(e.target.value) || 1)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Référence {refReadOnly ? '' : '(auto si vide)'}</label>
        <input type="text" value={form.ref_offre} onChange={e => onChange('ref_offre', e.target.value)}
          placeholder="Ex: AG170225001234" readOnly={refReadOnly}
          className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${refReadOnly ? 'bg-gray-50 text-gray-500' : ''}`} />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Description complète *</label>
      <textarea value={form.full_description} onChange={e => onChange('full_description', e.target.value)}
        placeholder={"Missions principales :\n- Mission 1\n- Mission 2\n\nProfil recherché :\n- Compétence 1\n- Compétence 2"}
        rows={8} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Meta description SEO (max 160 car., auto si vide)</label>
      <input type="text" maxLength={160} value={form.meta_description} onChange={e => onChange('meta_description', e.target.value)}
        placeholder="Générée automatiquement si laissée vide" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      <p className="text-xs text-gray-400 mt-1">{form.meta_description.length}/160</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés SEO (séparés par des virgules)</label>
        <input type="text" value={form.seo_keywords} onChange={e => onChange('seo_keywords', e.target.value)}
          placeholder="emploi agadir, développeur maroc, cdi agadir" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <p className="text-xs text-gray-400 mt-1">Générés automatiquement si laissés vides</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Compétences requises (séparées par des virgules)</label>
        <input type="text" value={form.required_skills} onChange={e => onChange('required_skills', e.target.value)}
          placeholder="JavaScript, React, Node.js, Git" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Fourchette salariale</label>
      <input type="text" value={form.suggested_salary_range} onChange={e => onChange('suggested_salary_range', e.target.value)}
        placeholder="Ex: 5000-8000 MAD" className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    </div>
  </>
);

// ── Main Admin component ──
const Admin: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'candidatures' | 'messages' | 'creer-offre' | 'offres'>('candidatures');

  // Candidatures
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [search, setSearch] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  // Create offer
  const [offerForm, setOfferForm] = useState<OfferForm>(EMPTY_OFFER_FORM);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [lastCreatedOffer, setLastCreatedOffer] = useState<{ emploi_metier: string; ville: string; type_contrat: string; raison_sociale: string; nbre_postes: number; slug: string } | null>(null);

  // Manage offers
  const [jobOffers, setJobOffers] = useState<JobOfferRow[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersSearch, setOffersSearch] = useState('');
  const [offersFilterCity, setOffersFilterCity] = useState('');
  const [offersFilterContract, setOffersFilterContract] = useState('');
  const [offersStatutFilter, setOffersStatutFilter] = useState<string>('active');
  const [editingOffer, setEditingOffer] = useState<JobOfferRow | null>(null);
  const [editForm, setEditForm] = useState<OfferForm>(EMPTY_OFFER_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const updateOfferField = useCallback(<K extends keyof OfferForm>(field: K, value: OfferForm[K]) => {
    setOfferForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateEditField = useCallback(<K extends keyof OfferForm>(field: K, value: OfferForm[K]) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── Auth ──
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_auth');
    if (saved === ADMIN_PASSWORD) setAuthed(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem('admin_auth', password);
    } else {
      alert('Mot de passe incorrect');
    }
  };

  // ── Data loading ──
  useEffect(() => {
    if (!authed) return;
    loadCandidatures();
    loadMessages();
    loadJobOffers();
  }, [authed]);

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

  const loadJobOffers = async () => {
    setOffersLoading(true);
    const { data, error } = await supabaseOffers
      .from('job_offers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erreur chargement offres:', error);
    } else {
      setJobOffers(data || []);
    }
    setOffersLoading(false);
  };

  // ── Candidature actions ──
  const toggleMessageRead = async (id: string, currentRead: boolean) => {
    const { error } = await supabaseOffers.from('messages').update({ is_read: !currentRead }).eq('id', id);
    if (!error) setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: !currentRead } : m));
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    const { error } = await supabaseOffers.from('messages').delete().eq('id', id);
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== id));
      if (expandedMessage === id) setExpandedMessage(null);
    }
  };

  const updateCandidatureStatus = async (id: string, newStatus: string) => {
    const { error } = await supabaseOffers.from('candidatures').update({ status: newStatus }).eq('id', id);
    if (!error) setCandidatures(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabaseOffers.from('candidatures').update({ notes: notesValue }).eq('id', id);
    if (!error) {
      setCandidatures(prev => prev.map(c => c.id === id ? { ...c, notes: notesValue } : c));
      setEditingNotes(null);
    }
  };

  const deleteCandidature = async (id: string) => {
    if (!confirm('Supprimer cette candidature ?')) return;
    const { error } = await supabaseOffers.from('candidatures').delete().eq('id', id);
    if (!error) setCandidatures(prev => prev.filter(c => c.id !== id));
  };

  // ── Create offer ──
  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfferError(null);
    setOfferSuccess(null);

    if (!offerForm.emploi_metier.trim() || !offerForm.raison_sociale.trim()) {
      setOfferError("Le poste et l'entreprise sont obligatoires.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(offerForm.date_offre)) {
      setOfferError('La date doit être au format YYYY-MM-DD.');
      return;
    }

    setOfferSubmitting(true);
    try {
      const refOffre = offerForm.ref_offre.trim() || generateRefOffre(offerForm.raison_sociale);
      const { data: existingRef } = await supabaseOffers.from('job_offers').select('ref_offre').eq('ref_offre', refOffre).limit(1);
      if (existingRef && existingRef.length > 0) {
        setOfferError(`Une offre avec la référence "${refOffre}" existe déjà.`);
        setOfferSubmitting(false);
        return;
      }

      const slug = await generateUniqueSlug(offerForm.emploi_metier, offerForm.ville, offerForm.raison_sociale);
      const seoKeywords = offerForm.seo_keywords
        ? offerForm.seo_keywords.split(',').map(k => k.trim()).filter(Boolean)
        : [`emploi ${offerForm.ville.toLowerCase()}`, `${offerForm.emploi_metier.toLowerCase()} maroc`, `recrutement souss-massa`];
      const requiredSkills = offerForm.required_skills ? offerForm.required_skills.split(',').map(k => k.trim()).filter(Boolean) : [];
      const metaDesc = offerForm.meta_description.trim() ||
        `${offerForm.emploi_metier} à ${offerForm.ville} - ${offerForm.type_contrat} chez ${offerForm.raison_sociale}. Postulez maintenant sur SoussMassa-RH.`.slice(0, 160);

      const { error } = await supabaseOffers.from('job_offers').insert([{
        emploi_metier: offerForm.emploi_metier.trim(),
        ville: offerForm.ville,
        type_contrat: offerForm.type_contrat,
        raison_sociale: offerForm.raison_sociale.trim(),
        date_offre: offerForm.date_offre,
        nbre_postes: offerForm.nbre_postes,
        ref_offre: refOffre,
        full_description: offerForm.full_description.trim(),
        meta_description: metaDesc,
        seo_keywords: seoKeywords,
        required_skills: requiredSkills,
        suggested_salary_range: offerForm.suggested_salary_range.trim() || null,
        source: offerForm.source,
        slug,
        statut: 'active',
      }]);

      if (error) {
        setOfferError(`Erreur Supabase : ${error.message}`);
      } else {
        setLastCreatedOffer({
          emploi_metier: offerForm.emploi_metier.trim(),
          ville: offerForm.ville,
          type_contrat: offerForm.type_contrat,
          raison_sociale: offerForm.raison_sociale.trim(),
          nbre_postes: offerForm.nbre_postes,
          slug,
        });
        setOfferSuccess(`Offre "${offerForm.emploi_metier}" publiée ! Slug : ${slug}`);
        setOfferForm(EMPTY_OFFER_FORM);
        loadJobOffers();
      }
    } catch (err: any) {
      setOfferError(`Erreur : ${err.message || 'Erreur inconnue'}`);
    } finally {
      setOfferSubmitting(false);
    }
  };

  // ── Manage offers actions ──
  const deleteJobOffer = async (id: string) => {
    if (!confirm('Supprimer définitivement cette offre ?')) return;
    const { error, count } = await supabaseOffers.from('job_offers').delete({ count: 'exact' }).eq('id', id);
    if (error) {
      alert(`Erreur suppression : ${error.message}`);
    } else if (count === 0) {
      alert('Erreur : la suppression a été bloquée par les permissions de la base de données (RLS). Ajoutez une politique DELETE pour le rôle anon dans Supabase.');
    } else {
      setJobOffers(prev => prev.filter(o => o.id !== id));
    }
  };

  const changeOfferStatut = async (offer: JobOfferRow, newStatut: string) => {
    const { error, count } = await supabaseOffers.from('job_offers').update({ statut: newStatut }, { count: 'exact' }).eq('id', offer.id);
    if (error) {
      alert(`Erreur changement statut : ${error.message}`);
    } else if (count === 0) {
      alert('Erreur : la modification a été bloquée par les permissions de la base de données (RLS). Ajoutez une politique UPDATE pour le rôle anon dans Supabase.');
    } else {
      setJobOffers(prev => prev.map(o => o.id === offer.id ? { ...o, statut: newStatut } : o));
    }
  };

  const toggleFeatured = async (offer: JobOfferRow) => {
    const newVal = !offer.is_featured;
    const { error, count } = await supabaseOffers.from('job_offers').update({ is_featured: newVal }, { count: 'exact' }).eq('id', offer.id);
    if (error) {
      alert(`Erreur : ${error.message}`);
    } else if (count === 0) {
      alert('Erreur : la modification a été bloquée par les permissions de la base de données (RLS).');
    } else {
      setJobOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_featured: newVal } : o));
    }
  };

  const openEditOffer = (offer: JobOfferRow) => {
    setEditingOffer(offer);
    setEditForm(offerToForm(offer));
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffer) return;
    setEditError(null);

    if (!editForm.emploi_metier.trim() || !editForm.raison_sociale.trim()) {
      setEditError("Le poste et l'entreprise sont obligatoires.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editForm.date_offre)) {
      setEditError('La date doit être au format YYYY-MM-DD.');
      return;
    }

    setEditSubmitting(true);
    try {
      const needNewSlug =
        editForm.emploi_metier.trim() !== editingOffer.emploi_metier ||
        editForm.ville !== editingOffer.ville;
      const slug = needNewSlug
        ? await generateUniqueSlug(editForm.emploi_metier, editForm.ville, editForm.raison_sociale, editingOffer.slug)
        : editingOffer.slug;

      const seoKeywords = editForm.seo_keywords
        ? editForm.seo_keywords.split(',').map(k => k.trim()).filter(Boolean)
        : [`emploi ${editForm.ville.toLowerCase()}`, `${editForm.emploi_metier.toLowerCase()} maroc`, `recrutement souss-massa`];
      const requiredSkills = editForm.required_skills ? editForm.required_skills.split(',').map(k => k.trim()).filter(Boolean) : [];
      const metaDesc = editForm.meta_description.trim() ||
        `${editForm.emploi_metier} à ${editForm.ville} - ${editForm.type_contrat} chez ${editForm.raison_sociale}. Postulez maintenant sur SoussMassa-RH.`.slice(0, 160);

      const { error, count } = await supabaseOffers.from('job_offers').update({
        emploi_metier: editForm.emploi_metier.trim(),
        ville: editForm.ville,
        type_contrat: editForm.type_contrat,
        raison_sociale: editForm.raison_sociale.trim(),
        date_offre: editForm.date_offre,
        nbre_postes: editForm.nbre_postes,
        full_description: editForm.full_description.trim(),
        meta_description: metaDesc,
        seo_keywords: seoKeywords,
        required_skills: requiredSkills,
        suggested_salary_range: editForm.suggested_salary_range.trim() || null,
        source: editForm.source,
        slug,
      }, { count: 'exact' }).eq('id', editingOffer.id);

      if (error) {
        setEditError(`Erreur Supabase : ${error.message}`);
      } else if (count === 0) {
        setEditError('Erreur : la modification a été bloquée par les permissions (RLS). Ajoutez une politique UPDATE pour anon dans Supabase.');
      } else {
        setJobOffers(prev => prev.map(o => o.id === editingOffer.id ? {
          ...o,
          emploi_metier: editForm.emploi_metier.trim(),
          ville: editForm.ville,
          type_contrat: editForm.type_contrat,
          raison_sociale: editForm.raison_sociale.trim(),
          date_offre: editForm.date_offre,
          nbre_postes: editForm.nbre_postes,
          full_description: editForm.full_description.trim(),
          meta_description: metaDesc,
          seo_keywords: seoKeywords,
          required_skills: requiredSkills,
          suggested_salary_range: editForm.suggested_salary_range.trim() || null,
          source: editForm.source,
          slug,
        } : o));
        setEditingOffer(null);
      }
    } catch (err: any) {
      setEditError(`Erreur : ${err.message || 'Erreur inconnue'}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Memos ──
  const jobTitles = useMemo(() => {
    const titles = new Set(candidatures.map(c => c.job_title));
    return Array.from(titles).sort();
  }, [candidatures]);

  const filteredCandidatures = useMemo(() => {
    return candidatures.filter(c => {
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterJob && c.job_title !== filterJob) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.candidate_name.toLowerCase().includes(q) || c.candidate_email.toLowerCase().includes(q) || (c.candidate_phone || '').includes(q);
      }
      return true;
    });
  }, [candidatures, filterStatus, filterJob, search]);

  const candidatureStats = useMemo(() => {
    const total = candidatures.length;
    const nouvelle = candidatures.filter(c => c.status === 'nouvelle').length;
    const preselection = candidatures.filter(c => c.status === 'présélection').length;
    const entretien = candidatures.filter(c => c.status === 'entretien').length;
    return { total, nouvelle, preselection, entretien };
  }, [candidatures]);

  const filteredOffers = useMemo(() => {
    return jobOffers.filter(o => {
      const statut = o.statut || 'active';
      if (offersStatutFilter && statut !== offersStatutFilter) return false;
      if (offersFilterCity && o.ville !== offersFilterCity) return false;
      if (offersFilterContract && o.type_contrat !== offersFilterContract) return false;
      if (offersSearch) {
        const q = offersSearch.toLowerCase();
        return o.emploi_metier.toLowerCase().includes(q) || o.raison_sociale.toLowerCase().includes(q) || o.ref_offre.toLowerCase().includes(q);
      }
      return true;
    });
  }, [jobOffers, offersSearch, offersFilterCity, offersFilterContract, offersStatutFilter]);

  const offersStats = useMemo(() => {
    const active = jobOffers.filter(o => (o.statut || 'active') === 'active').length;
    const suspendu = jobOffers.filter(o => o.statut === 'suspendu').length;
    const conclu = jobOffers.filter(o => o.statut === 'conclu').length;
    const featured = jobOffers.filter(o => o.is_featured && (o.statut || 'active') === 'active').length;
    return { active, suspendu, conclu, featured };
  }, [jobOffers]);

  const unreadMessages = messages.filter(m => !m.is_read).length;

  // ── Login screen ──
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-gray-900 text-center">Administration</h1>
          <p className="text-sm text-gray-500 text-center">Accès réservé au recruteur</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">Accéder</button>
        </form>
      </div>
    );
  }

  // ── Main dashboard ──
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez les candidatures, messages et offres</p>
        </div>
        <button onClick={() => { loadCandidatures(); loadMessages(); loadJobOffers(); }}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors self-start">
          Rafraîchir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('candidatures')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'candidatures' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          Candidatures ({candidatures.length})
        </button>
        <button onClick={() => setActiveTab('messages')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors relative ${activeTab === 'messages' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          Messages ({messages.length})
          {unreadMessages > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{unreadMessages}</span>}
        </button>
        <button onClick={() => setActiveTab('offres')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'offres' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          Offres ({offersStats.active})
        </button>
        <button onClick={() => setActiveTab('creer-offre')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'creer-offre' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          + Créer une offre
        </button>
      </div>

      {/* ═══ TAB: Candidatures ═══ */}
      {activeTab === 'candidatures' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900">{candidatureStats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
              <p className="text-2xl font-bold text-blue-700">{candidatureStats.nouvelle}</p>
              <p className="text-xs text-blue-600">Nouvelles</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-center">
              <p className="text-2xl font-bold text-yellow-700">{candidatureStats.preselection}</p>
              <p className="text-xs text-yellow-600">Présélection</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-center">
              <p className="text-2xl font-bold text-purple-700">{candidatureStats.entretien}</p>
              <p className="text-xs text-purple-600">Entretien</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 flex flex-col md:flex-row gap-3">
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un candidat…"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Tous les postes</option>
              {jobTitles.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Tous les statuts</option>
              {CANDIDATURE_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : filteredCandidatures.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200"><p className="text-gray-500">Aucune candidature trouvée</p></div>
          ) : (
            <div className="space-y-3">
              {filteredCandidatures.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{c.candidate_name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusStyle(c.status)}`}>
                          {CANDIDATURE_STATUS_OPTIONS.find(s => s.value === c.status)?.label || c.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-2">
                        <a href={`mailto:${c.candidate_email}`} className="text-blue-600 hover:underline">{c.candidate_email}</a>
                        {c.candidate_phone && <a href={`tel:${c.candidate_phone}`} className="text-blue-600 hover:underline">{c.candidate_phone}</a>}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{c.job_title}</span>
                        <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded">{c.company_name}</span>
                        <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded">Réf : {c.job_ref}</span>
                        <span className="text-gray-400">{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="mt-3">
                        {editingNotes === c.id ? (
                          <div className="flex gap-2">
                            <input type="text" value={notesValue} onChange={e => setNotesValue(e.target.value)} placeholder="Ajouter une note…"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />
                            <button onClick={() => saveNotes(c.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">OK</button>
                            <button onClick={() => setEditingNotes(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm">Annuler</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingNotes(c.id); setNotesValue(c.notes || ''); }} className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                            {c.notes ? `Note : ${c.notes}` : '+ Ajouter une note'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">
                      {c.cv_url && (
                        <a href={c.cv_url} target="_blank" rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors text-center">
                          CV {c.cv_filename?.split('.').pop()?.toUpperCase()}
                        </a>
                      )}
                      <select value={c.status} onChange={e => updateCandidatureStatus(c.id, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        {CANDIDATURE_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <button onClick={() => deleteCandidature(c.id)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm transition-colors">Supprimer</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-xs text-gray-400 mt-8">{filteredCandidatures.length} candidature{filteredCandidatures.length !== 1 ? 's' : ''} affichée{filteredCandidatures.length !== 1 ? 's' : ''}</p>
        </>
      )}

      {/* ═══ TAB: Messages ═══ */}
      {activeTab === 'messages' && (
        <>
          {messagesLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200"><p className="text-gray-500">Aucun message reçu</p></div>
          ) : (
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`bg-white rounded-xl border p-5 transition-colors cursor-pointer ${m.is_read ? 'border-gray-200' : 'border-blue-300 bg-blue-50/30'}`}
                  onClick={() => { setExpandedMessage(expandedMessage === m.id ? null : m.id); if (!m.is_read) toggleMessageRead(m.id, false); }}>
                  <div className="flex flex-col md:flex-row md:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        {!m.is_read && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />}
                        <h3 className={`font-bold text-gray-900 ${!m.is_read ? 'text-blue-900' : ''}`}>{m.sender_name}</h3>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{m.subject}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-1">
                        <a href={`mailto:${m.sender_email}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{m.sender_email}</a>
                        {m.sender_phone && <a href={`tel:${m.sender_phone}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{m.sender_phone}</a>}
                        <span className="text-gray-400 text-xs">{new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {expandedMessage === m.id
                        ? <p className="text-gray-700 text-sm mt-3 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{m.body}</p>
                        : <p className="text-gray-500 text-sm truncate mt-1">{m.body}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleMessageRead(m.id, m.is_read)} className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-xs transition-colors">{m.is_read ? 'Non lu' : 'Lu'}</button>
                      <button onClick={() => deleteMessage(m.id)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs transition-colors">Supprimer</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-xs text-gray-400 mt-8">{messages.length} message{messages.length !== 1 ? 's' : ''} · {unreadMessages} non lu{unreadMessages !== 1 ? 's' : ''}</p>
        </>
      )}

      {/* ═══ TAB: Gérer les offres ═══ */}
      {activeTab === 'offres' && (
        <>
          {/* Edit modal */}
          {editingOffer && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
              <form onSubmit={handleEditSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-5 mb-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Modifier l'offre</h2>
                  <button type="button" onClick={() => setEditingOffer(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
                {editError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{editError}</div>}
                <OfferFormFields form={editForm} onChange={updateEditField} refReadOnly />
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={editSubmitting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {editSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button type="button" onClick={() => setEditingOffer(null)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 text-center cursor-pointer hover:border-blue-300" onClick={() => setOffersStatutFilter('active')}>
              <p className="text-2xl font-bold text-gray-900">{offersStats.active}</p>
              <p className="text-xs text-gray-500">Actives</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-center cursor-pointer hover:border-orange-400" onClick={() => setOffersStatutFilter('suspendu')}>
              <p className="text-2xl font-bold text-orange-700">{offersStats.suspendu}</p>
              <p className="text-xs text-orange-600">Suspendues</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-300 text-center cursor-pointer hover:border-gray-400" onClick={() => setOffersStatutFilter('conclu')}>
              <p className="text-2xl font-bold text-gray-600">{offersStats.conclu}</p>
              <p className="text-xs text-gray-500">Conclues</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-center">
              <p className="text-2xl font-bold text-yellow-700">{offersStats.featured}</p>
              <p className="text-xs text-yellow-600">En vedette</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 flex flex-col md:flex-row gap-3">
            <input type="search" value={offersSearch} onChange={e => setOffersSearch(e.target.value)} placeholder="Rechercher poste, entreprise, réf…"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <select value={offersFilterCity} onChange={e => setOffersFilterCity(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Toutes les villes</option>
              {SOUSS_MASSA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={offersFilterContract} onChange={e => setOffersFilterContract(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Tous les contrats</option>
              {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={offersStatutFilter} onChange={e => setOffersStatutFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium">
              <option value="active">Actives</option>
              <option value="suspendu">Suspendues</option>
              <option value="conclu">Conclues</option>
              <option value="">Toutes</option>
            </select>
          </div>

          {/* List */}
          {offersLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : filteredOffers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">Aucune offre trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOffers.map(o => {
                const statut = o.statut || 'active';
                const cardBorder = statut === 'suspendu' ? 'border-orange-200 bg-orange-50/30' : statut === 'conclu' ? 'border-gray-300 bg-gray-50/50' : o.is_featured ? 'border-yellow-300 bg-yellow-50/20' : 'border-gray-200 hover:border-blue-300';
                return (
                <div key={o.id} className={`bg-white rounded-xl border p-5 transition-colors ${cardBorder}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-lg">{o.emploi_metier}</h3>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{o.type_contrat}</span>
                        {o.is_featured && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">En vedette</span>}
                        {statut === 'suspendu' && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">Suspendue</span>}
                        {statut === 'conclu' && <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Conclue</span>}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs mb-2">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{o.raison_sociale}</span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{o.ville}</span>
                        <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded">{o.nbre_postes} poste{o.nbre_postes > 1 ? 's' : ''}</span>
                        <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded">Réf : {o.ref_offre}</span>
                        {o.suggested_salary_range && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">{o.suggested_salary_range}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-gray-400">
                        <span>Publiée le {new Date(o.date_offre).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>Source : {o.source}</span>
                        <span className="text-blue-500">/{o.slug}</span>
                      </div>
                      {o.required_skills && o.required_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {o.required_skills.slice(0, 5).map((s, i) => (
                            <span key={i} className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-xs">{s}</span>
                          ))}
                          {o.required_skills.length > 5 && <span className="text-gray-400 text-xs">+{o.required_skills.length - 5}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">
                      <button onClick={() => openEditOffer(o)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors text-center">
                        Modifier
                      </button>
                      <a href={generateWhatsAppUrl(o)} target="_blank" rel="noopener noreferrer"
                        className="px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-bold hover:bg-[#1da851] transition-colors text-center">
                        WhatsApp
                      </a>
                      <button onClick={() => toggleFeatured(o)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center ${o.is_featured ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {o.is_featured ? 'Retirer vedette' : 'En vedette'}
                      </button>
                      {statut === 'active' && (
                        <>
                          <button onClick={() => changeOfferStatut(o, 'suspendu')}
                            className="px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg text-sm font-medium transition-colors text-center">
                            Suspendre
                          </button>
                          <button onClick={() => changeOfferStatut(o, 'conclu')}
                            className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors text-center">
                            Conclure
                          </button>
                        </>
                      )}
                      {(statut === 'suspendu' || statut === 'conclu') && (
                        <button onClick={() => changeOfferStatut(o, 'active')}
                          className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors text-center">
                          Réactiver
                        </button>
                      )}
                      <button onClick={() => deleteJobOffer(o.id)}
                        className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors text-center">
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
                ); })}
            </div>
          )}
          <p className="text-center text-xs text-gray-400 mt-8">
            {filteredOffers.length} offre{filteredOffers.length !== 1 ? 's' : ''} affichée{filteredOffers.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* ═══ TAB: Créer une offre ═══ */}
      {activeTab === 'creer-offre' && (
        <form onSubmit={handleOfferSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">Nouvelle offre d'emploi</h2>
          {offerError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{offerError}</div>}
          {offerSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              <p>{offerSuccess}</p>
              {lastCreatedOffer && (
                <a href={generateWhatsAppUrl(lastCreatedOffer)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-bold hover:bg-[#1da851] transition-colors">
                  <svg viewBox="0 0 32 32" width="18" height="18" fill="white">
                    <path d="M16.004 2.667A13.26 13.26 0 0 0 2.67 15.923a13.16 13.16 0 0 0 1.795 6.636L2.667 29.333l7.005-1.77a13.3 13.3 0 0 0 6.332 1.607h.005c7.32 0 13.324-5.95 13.324-13.267A13.21 13.21 0 0 0 16.004 2.667Zm0 24.27a11.03 11.03 0 0 1-5.618-1.535l-.403-.24-4.178 1.094 1.115-4.07-.263-.418a10.93 10.93 0 0 1-1.685-5.84c0-6.065 4.94-11.003 11.037-11.003a11.01 11.01 0 0 1 11.026 11.023c0 6.065-4.95 11.003-11.031 10.99Zm6.048-8.24c-.332-.166-1.964-.97-2.269-1.08-.305-.111-.527-.166-.749.167-.222.332-.86 1.08-1.054 1.302-.194.222-.389.25-.72.083-.332-.166-1.403-.517-2.672-1.648-.987-.88-1.654-1.966-1.848-2.298-.194-.332-.02-.512.146-.678.15-.148.332-.389.499-.583.166-.194.222-.332.332-.555.111-.222.056-.416-.028-.583-.083-.166-.749-1.803-1.026-2.468-.27-.649-.545-.56-.749-.571l-.638-.011a1.225 1.225 0 0 0-.888.416c-.305.332-1.165 1.136-1.165 2.773 0 1.636 1.193 3.217 1.358 3.44.167.221 2.348 3.582 5.688 5.023.795.343 1.415.548 1.899.702.798.253 1.524.218 2.098.132.64-.095 1.964-.803 2.24-1.58.278-.776.278-1.44.195-1.58-.083-.138-.305-.222-.638-.388Z"/>
                  </svg>
                  Partager sur WhatsApp
                </a>
              )}
            </div>
          )}
          <OfferFormFields form={offerForm} onChange={updateOfferField} />
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={offerSubmitting}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {offerSubmitting ? 'Publication en cours...' : "Publier l'offre"}
            </button>
            <button type="button" onClick={() => { setOfferForm(EMPTY_OFFER_FORM); setOfferError(null); setOfferSuccess(null); setLastCreatedOffer(null); }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
              Réinitialiser
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Admin;
