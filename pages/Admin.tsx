import React, { useState, useEffect, useMemo } from 'react';
import { supabaseOffers } from '../src/services/supabase';

const ADMIN_PASSWORD = 'souss2026';

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
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'candidatures' | 'messages'>('candidatures');
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterJob, setFilterJob] = useState('');
  const [search, setSearch] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!authed) return;
    loadCandidatures();
    loadMessages();
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

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-gray-900 text-center">Administration</h1>
          <p className="text-sm text-gray-500 text-center">Accès réservé au recruteur</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Accéder
          </button>
        </form>
      </div>
    );
  }

  const unreadMessages = messages.filter(m => !m.is_read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 text-sm mt-1">Gérez les candidatures et messages</p>
        </div>
        <button
          onClick={() => { loadCandidatures(); loadMessages(); }}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors self-start"
        >
          Rafraîchir
        </button>
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
                      {c.cv_url && (
                        <a
                          href={c.cv_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors text-center"
                        >
                          CV {c.cv_filename?.split('.').pop()?.toUpperCase()}
                        </a>
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
    </div>
  );
};

export default Admin;
