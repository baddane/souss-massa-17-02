import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../src/services/supabase';
import { jobOffersService } from '../services/jobOffersService';
import { toast } from 'react-toastify';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `il y a ${mins  || 1} min`;
  if (hours < 24)  return `il y a ${hours} h`;
  if (days  < 30)  return `il y a ${days} jour${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  soumise:   { label: 'Soumise',     bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-500',   border: 'border-blue-200'   },
  en_cours:  { label: 'En cours',    bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-500', border: 'border-violet-200' },
  entretien: { label: 'Entretien',   bg: 'bg-amber-50',  text: 'text-amber-600',  dot: 'bg-amber-500',  border: 'border-amber-200'  },
  refusee:   { label: 'Refusée',     bg: 'bg-red-50',    text: 'text-red-500',    dot: 'bg-red-400',    border: 'border-red-200'    },
  embauchee: { label: 'Embauchée !', bg: 'bg-green-50',  text: 'text-green-600',  dot: 'bg-green-500',  border: 'border-green-200'  },
};

const PIPELINE_STAGES = ['soumise', 'en_cours', 'entretien', 'embauchee'] as const;

const CONTRACT_LABELS: Record<string, string> = {
  stage: 'Stage', cdi: 'CDI', cdd: 'CDD',
  freelance: 'Freelance', alternance: 'Alternance', interim: 'Intérim',
};

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
];

function normalizeStatus(s: string): string {
  if (!s) return 'soumise';
  const l = s.toLowerCase().replace(/ /g, '_');
  if (l === 'entretien') return 'entretien';
  if (l.includes('refus')) return 'refusee';
  if (l.includes('embauch')) return 'embauchee';
  if (l === 'en_cours') return 'en_cours';
  return 'soumise';
}

function getProfileScore(p: any): number {
  if (!p) return 0;
  const checks: [boolean, number][] = [
    [!!(p.first_name && p.last_name), 15],
    [!!p.phone, 10], [!!p.city, 5], [!!p.education_level, 10],
    [!!p.field_of_study, 10], [!!(p.skills?.length > 0), 15],
    [p.experience_years != null, 5], [!!p.cv_url, 20],
    [!!(p.linkedin_url || p.github_url), 5], [!!p.availability, 5],
  ];
  return checks.reduce((sum, [c, w]) => sum + (c ? w : 0), 0);
}

// ─── Shared base components ───────────────────────────────────────────────────

const StatCard = ({ title, value, icon, trend, sub, color = 'blue' }: {
  title: string; value: string | number; icon: React.ReactNode;
  trend?: string; sub?: string; color?: string;
}) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 bg-${color}-50 text-${color}-600 rounded-xl flex items-center justify-center`}>{icon}</div>
      {trend && <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">{trend}</span>}
    </div>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
    <p className="text-3xl font-black text-gray-900 mt-1">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const SidebarItem = ({ active, label, icon, badge, onClick }: {
  active: boolean; label: string; icon: React.ReactNode; badge?: number; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <div className="flex items-center space-x-3">
      <span className="flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </div>
    {badge != null && badge > 0 && (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${active ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
        {badge}
      </span>
    )}
  </button>
);

const EmptyState = ({ icon, title, description, actionLabel, actionHref }: {
  icon: React.ReactNode; title: string; description: string; actionLabel?: string; actionHref?: string;
}) => (
  <div className="bg-white p-10 rounded-[2rem] border border-gray-100 text-center space-y-4">
    <div className="flex justify-center text-4xl text-gray-300">{icon}</div>
    <h3 className="text-xl font-black text-gray-900">{title}</h3>
    <p className="text-gray-500 max-w-sm mx-auto text-sm">{description}</p>
    {actionLabel && actionHref && (
      <Link to={actionHref} className="inline-block mt-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all">
        {actionLabel}
      </Link>
    )}
  </div>
);

// ─── SVG icons ────────────────────────────────────────────────────────────────

const Icon = {
  chart:    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  list:     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  user:     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  folder:   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>,
  bell:     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  search:   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  building: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  briefcase:<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  people:   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  check:    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>,
  pin:      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  clock:    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  cv:       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  eye:      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  send:     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  star:     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  x:        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  plus:     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  pen:      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  trend:    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  percent:  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  interview:<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  reply:    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>,
};

// ─── Candidate components ─────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.soumise;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
};

const AppPipeline = ({ status }: { status: string }) => {
  const isRefused = status === 'refusee';
  const currentIdx = PIPELINE_STAGES.indexOf(status as typeof PIPELINE_STAGES[number]);
  return (
    <div className="flex items-center space-x-1" aria-label={`Étape : ${STATUS_CONFIG[status]?.label}`}>
      {PIPELINE_STAGES.map((stage, i) => (
        <React.Fragment key={stage}>
          <div className={`w-2 h-2 rounded-full transition-all ${isRefused ? 'bg-red-200' : i <= currentIdx ? 'bg-blue-500' : 'bg-gray-200'}`} />
          {i < PIPELINE_STAGES.length - 1 && (
            <div className={`h-px w-5 ${isRefused ? 'bg-red-100' : i < currentIdx ? 'bg-blue-500' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const AppCard = ({ app, onSelect, selected }: { app: any; onSelect: () => void; selected: boolean }) => {
  const initials = (app.company || '?').slice(0, 2).toUpperCase();
  const colorIdx = (initials.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return (
    <div>
      <button
        onClick={onSelect}
        className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 transition-colors rounded-2xl text-left ${selected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50/60'}`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${AVATAR_COLORS[colorIdx]}`} aria-hidden="true">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 leading-tight truncate">{app.offerTitle}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs text-gray-400 font-semibold truncate">{app.company}</p>
              {app.contractType && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                  {CONTRACT_LABELS[app.contractType] || app.contractType}
                </span>
              )}
              {app.viewedByCompany && (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold flex-shrink-0 border border-emerald-200">
                  Vu par le recruteur
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <AppPipeline status={app.status} />
            <p className="text-[10px] text-gray-400 font-medium mt-1">{timeAgo(app.rawDate)}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </button>

      {/* Detail expanded */}
      {selected && (
        <div className="mx-4 mb-3 p-4 bg-white border border-blue-100 rounded-2xl space-y-3 text-sm">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">{Icon.clock} Postuléle : <strong className="text-gray-800">{app.date}</strong></span>
            {app.contractType && <span className="flex items-center gap-1">{Icon.briefcase} <strong className="text-gray-800">{CONTRACT_LABELS[app.contractType] || app.contractType}</strong></span>}
          </div>
          {app.hasCoverLetter ? (
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-700 mb-1">Lettre de motivation jointe</p>
              <p className="text-xs text-indigo-600">{app.coverLetter || 'Lettre envoyée avec votre candidature.'}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Aucune lettre de motivation pour cette candidature.</p>
          )}
          <div className="pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {app.status === 'soumise'    && 'Votre candidature est en attente d\'examen par le recruteur.'}
              {app.status === 'en_cours'   && 'Le recruteur examine votre dossier. Restez disponible.'}
              {app.status === 'entretien'  && 'Félicitations ! Vous êtes invité à un entretien. Vérifiez votre email.'}
              {app.status === 'embauchee'  && 'Félicitations pour votre embauche !'}
              {app.status === 'refusee'    && 'Votre candidature n\'a pas été retenue cette fois. Ne vous découragez pas !'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Candidate View ───────────────────────────────────────────────────────────

const CandidateView = ({ user: _user }: { user: any }) => {
  const [activeTab, setActiveTab]           = useState('overview');
  const [apps, setApps]                     = useState<any[]>([]);
  const [profile, setProfile]               = useState<any>(null);
  const [loading, setLoading]               = useState(true);
  const [appFilter, setAppFilter]           = useState('all');
  const [selectedAppId, setSelectedAppId]   = useState<string | null>(null);
  const [recommendedOffers, setRecommendedOffers] = useState<any[]>([]);
  const [alertForm, setAlertForm]           = useState({ city: '', contractType: '', keywords: '', email: '' });
  const [alertSaved, setAlertSaved]         = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: studentProfile } = await supabase
          .from('student_profiles').select('*').eq('user_id', authUser.id).single();
        if (!studentProfile) return;
        setProfile(studentProfile);

        const { data: applications } = await supabase
          .from('applications')
          .select(`id, status, submitted_at, viewed_by_company, cover_letter,
            job_offers(id, title, contract_type, work_type, company_profiles(company_name))`)
          .eq('student_id', studentProfile.id)
          .order('submitted_at', { ascending: false });

        const mapped = (applications || []).map((app: any) => ({
          id: app.id,
          offerTitle:      app.job_offers?.title || 'Offre inconnue',
          company:         app.job_offers?.company_profiles?.company_name || '',
          contractType:    app.job_offers?.contract_type || '',
          status:          normalizeStatus(app.status),
          date:            new Date(app.submitted_at).toLocaleDateString('fr-FR'),
          rawDate:         app.submitted_at,
          viewedByCompany: app.viewed_by_company,
          hasCoverLetter:  !!app.cover_letter,
          coverLetter:     app.cover_letter || '',
        }));
        setApps(mapped);

        // Offres recommandées basées sur les compétences
        if (studentProfile.skills?.length > 0) {
          try {
            const all = await jobOffersService.getAllJobOffers();
            const skills: string[] = studentProfile.skills.map((s: string) => s.toLowerCase());
            const scored = all
              .map((o: any) => {
                const kw = ((o.seo_keywords || '') + ' ' + (o.emploi_metier || '')).toLowerCase();
                const required: string[] = (o.required_skills || []).map((s: string) => s.toLowerCase());
                const matches = skills.filter(s => kw.includes(s) || required.includes(s)).length;
                return { ...o, _score: matches };
              })
              .filter((o: any) => o._score > 0)
              .sort((a: any, b: any) => b._score - a._score)
              .slice(0, 5);
            setRecommendedOffers(scored);
          } catch { /* non bloquant */ }
        }

        setAlertForm(f => ({
          ...f,
          city:         studentProfile.city || '',
          keywords:     (studentProfile.skills || []).slice(0, 2).join(', '),
          email:        authUser.email || '',
        }));
      } catch {
        setApps([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalApps      = apps.length;
  const responseCount  = apps.filter(a => ['en_cours','entretien','refusee','embauchee'].includes(a.status)).length;
  const interviewCount = apps.filter(a => a.status === 'entretien').length;
  const hiredCount     = apps.filter(a => a.status === 'embauchee').length;
  const refusedCount   = apps.filter(a => a.status === 'refusee').length;
  const responseRate   = totalApps > 0 ? Math.round((responseCount / totalApps) * 100) : 0;
  const profileScore   = getProfileScore(profile);
  const activeAppsCount = apps.filter(a => ['soumise','en_cours','entretien'].includes(a.status)).length;

  const pipelineCounts = {
    soumise: apps.filter(a => a.status === 'soumise').length,
    en_cours: apps.filter(a => a.status === 'en_cours').length,
    entretien: interviewCount, embauchee: hiredCount, refusee: refusedCount,
  };

  const FILTERS = [
    { key: 'all',       label: `Toutes (${totalApps})` },
    { key: 'active',    label: `Actives (${activeAppsCount})` },
    { key: 'entretien', label: `Entretiens (${interviewCount})` },
    { key: 'embauchee', label: `Embauchée (${hiredCount})` },
    { key: 'refusee',   label: `Refusées (${refusedCount})` },
  ];

  const filteredApps = appFilter === 'all' ? apps
    : appFilter === 'active' ? apps.filter(a => ['soumise','en_cours','entretien'].includes(a.status))
    : apps.filter(a => a.status === appFilter);

  const missingFields = profile ? [
    !profile.phone && 'Téléphone', !profile.city && 'Ville',
    !profile.education_level && "Niveau d'études", !profile.field_of_study && "Domaine d'études",
    !(profile.skills?.length > 0) && 'Compétences', !profile.cv_url && 'CV',
    !(profile.linkedin_url || profile.github_url) && 'Lien professionnel', !profile.availability && 'Disponibilité',
  ].filter(Boolean) as string[] : [];

  const handleSaveAlert = () => {
    setAlertSaved(true);
    toast.success('Alerte emploi enregistrée ! Vous serez notifié par email.');
    setTimeout(() => setAlertSaved(false), 5000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">

      {/* Sidebar */}
      <aside className="lg:w-64 space-y-1.5 flex-shrink-0" aria-label="Navigation du tableau de bord">
        <SidebarItem active={activeTab==='overview'}  label="Aperçu"         icon={Icon.chart}    onClick={() => setActiveTab('overview')} />
        <SidebarItem active={activeTab==='apps'}      label="Candidatures"   icon={Icon.list}     badge={totalApps} onClick={() => setActiveTab('apps')} />
        <SidebarItem active={activeTab==='profile'}   label="Mon Profil"     icon={Icon.user}     onClick={() => setActiveTab('profile')} />
        <SidebarItem active={activeTab==='docs'}      label="Documents"      icon={Icon.folder}   onClick={() => setActiveTab('docs')} />
        <SidebarItem active={activeTab==='alerts'}    label="Alertes Emploi" icon={Icon.bell}     onClick={() => setActiveTab('alerts')} />

        {/* Score profil */}
        {profile && (
          <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Force du profil</p>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-black text-gray-800">{profileScore}%</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${profileScore===100?'bg-green-50 text-green-600':profileScore>=60?'bg-blue-50 text-blue-600':'bg-amber-50 text-amber-600'}`}>
                {profileScore===100 ? 'Excellent' : profileScore>=60 ? 'Bon' : 'À améliorer'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={profileScore} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full rounded-full transition-all duration-700 ${profileScore===100?'bg-green-500':profileScore>=60?'bg-blue-500':'bg-amber-400'}`} style={{ width: `${profileScore}%` }} />
            </div>
            {profileScore < 100 && (
              <button onClick={() => setActiveTab('profile')} className="text-xs text-blue-600 font-bold mt-2 hover:underline block">
                Améliorer mon profil →
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 space-y-6">
        {loading && (
          <div className="flex justify-center py-20" role="status" aria-label="Chargement">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" aria-hidden="true" />
          </div>
        )}

        {!loading && (
          <>
            {/* ══════════════ APERÇU ══════════════ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">

                {/* Banner complétion profil */}
                {profileScore < 80 && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-black">Complétez votre profil</h3>
                        <p className="text-blue-100 text-sm mt-0.5">
                          Un profil complet augmente vos chances de {profileScore < 50 ? '5×' : '2×'}
                        </p>
                        {missingFields.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {missingFields.slice(0,4).map(f => (
                              <span key={f} className="text-[10px] bg-white/20 px-2.5 py-1 rounded-full font-bold">{f} manquant</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl font-black">{profileScore}%</span>
                        </div>
                        <button onClick={() => setActiveTab('profile')} className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex-shrink-0">
                          Compléter
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${profileScore}%` }} />
                    </div>
                  </div>
                )}

                {/* KPI */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Candidatures" value={totalApps}         icon={Icon.list}      />
                  <StatCard title="Réponses"      value={responseCount}     icon={Icon.reply}     />
                  <StatCard title="Taux réponse"  value={`${responseRate}%`} icon={Icon.trend}    />
                  <StatCard title="Entretiens"    value={interviewCount}    icon={Icon.interview} />
                </div>

                {/* Pipeline */}
                {totalApps > 0 && (
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
                    <h3 className="font-black text-gray-900 mb-5">Pipeline de candidatures</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { key:'soumise',   label:'Soumise',   colorVal:'blue',   desc:'En attente' },
                        { key:'en_cours',  label:'En cours',  colorVal:'violet', desc:'Examinée'   },
                        { key:'entretien', label:'Entretien', colorVal:'amber',  desc:'Invité'     },
                        { key:'embauchee', label:'Embauchée', colorVal:'green',  desc:'Succès'     },
                        { key:'refusee',   label:'Refusée',   colorVal:'red',    desc:'Non retenu' },
                      ].map(stage => {
                        const count = pipelineCounts[stage.key as keyof typeof pipelineCounts];
                        return (
                          <button
                            key={stage.key}
                            onClick={() => { setAppFilter(stage.key === 'soumise' || stage.key === 'en_cours' ? 'active' : stage.key); setActiveTab('apps'); }}
                            className={`text-center p-3 rounded-2xl bg-${stage.colorVal}-50 hover:opacity-80 transition-opacity`}
                          >
                            <div className={`text-2xl font-black text-${stage.colorVal}-600`}>{count}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-0.5 leading-tight">{stage.label}</div>
                            <div className="text-[9px] text-gray-400 mt-0.5">{stage.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dernières candidatures */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <h3 className="font-black text-gray-900">Dernières candidatures</h3>
                    <div className="flex items-center gap-3">
                      {totalApps > 3 && (
                        <button onClick={() => setActiveTab('apps')} className="text-xs font-bold text-blue-600 hover:underline">
                          Voir tout ({totalApps})
                        </button>
                      )}
                      <Link to="/offres" className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors">
                        Nouvelles offres →
                      </Link>
                    </div>
                  </div>
                  {apps.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-400 font-medium">Aucune candidature pour le moment.</p>
                      <Link to="/offres" className="text-blue-600 text-sm font-bold hover:underline mt-2 inline-block">
                        Parcourir les offres →
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50/80 px-2">
                      {apps.slice(0,4).map(app => (
                        <AppCard key={app.id} app={app}
                          onSelect={() => setSelectedAppId(selectedAppId === app.id ? null : app.id)}
                          selected={selectedAppId === app.id}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Offres recommandées */}
                {recommendedOffers.length > 0 && (
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50">
                      <div>
                        <h3 className="font-black text-gray-900">Offres recommandées pour vous</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Basées sur vos compétences et votre profil</p>
                      </div>
                      <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-widest">
                        {Icon.star} Match IA
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {recommendedOffers.map((offer: any) => (
                        <div key={offer.id} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50/60 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0" aria-hidden="true">
                              {(offer.raison_sociale || '?').charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">{offer.emploi_metier}</p>
                              <p className="text-xs text-gray-400">{offer.raison_sociale} · {offer.ville}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold hidden sm:block">
                              {offer.type_contrat}
                            </span>
                            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-full font-bold hidden sm:block">
                              {offer._score} compétence{offer._score > 1 ? 's' : ''} correspondante{offer._score > 1 ? 's' : ''}
                            </span>
                            <Link to="/offres" className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                              Voir
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions rapides */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link to="/offres" className="bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-5 flex items-center gap-4 transition-all group">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0 text-blue-600">{Icon.search}</div>
                    <div>
                      <p className="font-black text-sm text-gray-900">Explorer les offres</p>
                      <p className="text-xs text-gray-400 mt-0.5">Trouvez votre prochain poste</p>
                    </div>
                  </Link>
                  <button onClick={() => setActiveTab('profile')} className="bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-5 flex items-center gap-4 transition-all group text-left">
                    <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors flex-shrink-0 text-purple-600">{Icon.pen}</div>
                    <div>
                      <p className="font-black text-sm text-gray-900">Mettre à jour mon profil</p>
                      <p className="text-xs text-gray-400 mt-0.5">Profil à {profileScore}%</p>
                    </div>
                  </button>
                  <button onClick={() => setActiveTab('alerts')} className="bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-5 flex items-center gap-4 transition-all group text-left">
                    <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors flex-shrink-0 text-amber-600">{Icon.bell}</div>
                    <div>
                      <p className="font-black text-sm text-gray-900">Configurer mes alertes</p>
                      <p className="text-xs text-gray-400 mt-0.5">Ne ratez aucune offre</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════ CANDIDATURES ══════════════ */}
            {activeTab === 'apps' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Mes candidatures</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{totalApps} candidature{totalApps > 1 ? 's' : ''} · Cliquez pour voir les détails</p>
                  </div>
                  <Link to="/offres" className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">
                    + Postuler
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres candidatures">
                  {FILTERS.map(f => (
                    <button key={f.key} onClick={() => setAppFilter(f.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${appFilter===f.key ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {totalApps > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-wrap gap-4 items-center" aria-label="Légende pipeline">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pipeline :</span>
                    {PIPELINE_STAGES.map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                        {i > 0 && <span className="text-gray-300">→</span>}
                        <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} aria-hidden="true" />
                        {STATUS_CONFIG[s].label}
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 sm:ml-auto">
                      <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG.refusee.dot}`} aria-hidden="true" />
                      {STATUS_CONFIG.refusee.label}
                    </div>
                  </div>
                )}

                {filteredApps.length === 0 ? (
                  <EmptyState icon={Icon.list} title="Aucune candidature ici"
                    description={appFilter==='all' ? 'Commencez à postuler pour voir votre historique.' : 'Aucune candidature dans cette catégorie.'}
                    actionLabel="Parcourir les offres" actionHref="/offres"
                  />
                ) : (
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-50/80 px-2">
                      {filteredApps.map(app => (
                        <AppCard key={app.id} app={app}
                          onSelect={() => setSelectedAppId(selectedAppId === app.id ? null : app.id)}
                          selected={selectedAppId === app.id}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ PROFIL ══════════════ */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Mon Profil</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Visible par les recruteurs</p>
                  </div>
                  <Link to="/profil" className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">
                    Modifier le profil
                  </Link>
                </div>
                {!profile ? (
                  <EmptyState icon={Icon.user} title="Profil introuvable" description="Complétez votre inscription pour accéder à votre profil." actionLabel="Compléter le profil" actionHref="/profil" />
                ) : (
                  <>
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0" aria-hidden="true">
                          {(profile.first_name?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-2xl font-black text-gray-900 leading-tight">{profile.first_name} {profile.last_name}</h3>
                          <p className="text-gray-500 font-medium mt-0.5">
                            {profile.field_of_study || 'Domaine non renseigné'}{profile.education_level && ` · ${profile.education_level}`}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {profile.city && <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-semibold flex items-center gap-1">{Icon.pin}{profile.city}</span>}
                            {profile.experience_years != null && <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-semibold">{profile.experience_years} an{profile.experience_years > 1 ? 's' : ''} d'expérience</span>}
                            {profile.availability && <span className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full font-semibold border border-green-200">{profile.availability}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-3xl font-black ${profileScore===100?'text-green-500':profileScore>=60?'text-blue-600':'text-amber-500'}`}>{profileScore}%</div>
                          <p className="text-xs text-gray-400 font-semibold">Complété</p>
                        </div>
                      </div>
                      <div className="mt-6 h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={profileScore} aria-valuemin={0} aria-valuemax={100}>
                        <div className={`h-full rounded-full transition-all duration-700 ${profileScore===100?'bg-green-500':profileScore>=60?'bg-blue-500':'bg-amber-400'}`} style={{ width:`${profileScore}%` }} />
                      </div>
                      {missingFields.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                          <span className="text-xs text-gray-400 font-semibold">À compléter :</span>
                          {missingFields.map(f => <span key={f} className="text-[10px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-bold border border-amber-200">{f}</span>)}
                        </div>
                      )}
                    </div>
                    {profile.skills?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h4 className="font-black text-gray-900 mb-4">Compétences</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill: string) => (
                            <span key={skill} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-sm font-bold border border-blue-100">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {profile.languages?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h4 className="font-black text-gray-900 mb-4">Langues</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.languages.map((lang: string) => (
                            <span key={lang} className="bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-xl text-sm font-bold">{lang}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <h4 className="font-black text-gray-900 mb-4">Informations de contact</h4>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { label:'Téléphone', value:profile.phone, icon:Icon.send },
                          { label:'Ville',     value:profile.city,  icon:Icon.pin  },
                          { label:'Disponibilité', value:profile.availability, icon:Icon.clock },
                        ].filter(i => i.value).map(item => (
                          <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <span className="text-gray-400 flex-shrink-0">{item.icon}</span>
                            <div>
                              <dt className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{item.label}</dt>
                              <dd className="text-sm font-bold text-gray-800">{item.value}</dd>
                            </div>
                          </div>
                        ))}
                      </dl>
                    </div>
                    {(profile.linkedin_url || profile.github_url || profile.portfolio_url) && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h4 className="font-black text-gray-900 mb-4">Liens professionnels</h4>
                        <div className="flex flex-wrap gap-3">
                          {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">LinkedIn</a>}
                          {profile.github_url && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-900 transition-colors">GitHub</a>}
                          {profile.portfolio_url && <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors">Portfolio</a>}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ══════════════ DOCUMENTS ══════════════ */}
            {activeTab === 'docs' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-gray-900">Documents</h2>
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 flex-shrink-0">{Icon.cv}</div>
                      <div>
                        <h4 className="font-black text-gray-900 text-lg">Mon CV</h4>
                        {profile?.cv_url ? (
                          <>
                            <p className="text-sm text-gray-500 mt-0.5">CV disponible pour les recruteurs</p>
                            <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-bold mt-2 inline-block border border-green-200">En ligne</span>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-500 mt-0.5">Aucun CV téléchargé</p>
                            <span className="text-[10px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-bold mt-2 inline-block border border-amber-200">Manquant</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Link to="/profil" className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex-shrink-0">
                      {profile?.cv_url ? 'Mettre à jour' : 'Ajouter un CV'}
                    </Link>
                  </div>
                  {!profile?.cv_url && (
                    <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <p className="text-sm font-bold text-amber-700">Conseil</p>
                      <p className="text-xs text-amber-600 mt-1">Un CV en ligne augmente vos chances de réponse de 80%.</p>
                    </div>
                  )}
                  {profile?.cv_url && (
                    <div className="mt-6 flex gap-3">
                      <a href={profile.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                        {Icon.eye} Visualiser
                      </a>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2rem] border border-indigo-100 p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 flex-shrink-0">{Icon.pen}</div>
                    <div className="flex-1">
                      <h4 className="font-black text-gray-900">Lettres de motivation</h4>
                      <p className="text-sm text-gray-600 mt-1">Personnalisez votre lettre pour chaque candidature depuis la page de l'offre.</p>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm font-bold text-indigo-700 mb-1.5">
                          <span>{apps.filter(a => a.hasCoverLetter).length} / {totalApps} candidatures avec lettre</span>
                          <span>{totalApps > 0 ? Math.round((apps.filter(a=>a.hasCoverLetter).length/totalApps)*100) : 0}%</span>
                        </div>
                        <div className="h-2 bg-indigo-100 rounded-full overflow-hidden" role="progressbar">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: totalApps > 0 ? `${(apps.filter(a=>a.hasCoverLetter).length/totalApps)*100}%` : '0%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════ ALERTES ══════════════ */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Alertes Emploi</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Soyez notifié dès qu'une offre correspondant à votre profil est publiée</p>
                </div>

                {/* Formulaire alerte */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">{Icon.bell}</div>
                    <div>
                      <h3 className="font-black text-gray-900">Configurer votre alerte</h3>
                      <p className="text-xs text-gray-400">Recevez un email dès qu'une offre correspond à vos critères</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="alert-email" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Email de notification</label>
                      <input id="alert-email" type="email" value={alertForm.email}
                        onChange={e => setAlertForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="votre@email.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="alert-keywords" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Mots-clés (métier, compétences)</label>
                      <input id="alert-keywords" type="text" value={alertForm.keywords}
                        onChange={e => setAlertForm(f => ({ ...f, keywords: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="ex : développeur, marketing, comptable"
                      />
                    </div>
                    <div>
                      <label htmlFor="alert-city" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Ville</label>
                      <select id="alert-city" value={alertForm.city}
                        onChange={e => setAlertForm(f => ({ ...f, city: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="">Toutes les villes</option>
                        {['Agadir','Inezgane','Taroudant','Tiznit','Essaouira','Marrakech'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="alert-contract" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Type de contrat</label>
                      <select id="alert-contract" value={alertForm.contractType}
                        onChange={e => setAlertForm(f => ({ ...f, contractType: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="">Tous types</option>
                        {['CDI','CDD','Stage','Alternance','Freelance'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {alertSaved && (
                    <div role="alert" className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-200">
                      <span className="text-green-600 flex-shrink-0">{Icon.check}</span>
                      <p className="text-sm font-bold text-green-700">Alerte enregistrée ! Vous recevrez des notifications à <strong>{alertForm.email}</strong></p>
                    </div>
                  )}

                  <button onClick={handleSaveAlert}
                    className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 justify-center">
                    {Icon.bell} Activer l'alerte
                  </button>
                </div>

                {/* Stats carrière */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center"><div className="text-3xl font-black text-blue-600">{totalApps}</div><div className="text-xs font-black text-gray-400 uppercase tracking-wider mt-1">Candidatures envoyées</div></div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center"><div className="text-3xl font-black text-amber-500">{interviewCount}</div><div className="text-xs font-black text-gray-400 uppercase tracking-wider mt-1">Entretiens obtenus</div></div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center"><div className="text-3xl font-black text-green-500">{hiredCount}</div><div className="text-xs font-black text-gray-400 uppercase tracking-wider mt-1">Embauche{hiredCount>1?'s':''}</div></div>
                </div>

                {/* Checklist conseils */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                  <h4 className="font-black text-gray-900 mb-2">Votre checklist candidature</h4>
                  {[
                    { label:'CV téléchargé et à jour',            done: !!profile?.cv_url },
                    { label:'Profil complété à 80% minimum',      done: profileScore >= 80 },
                    { label:'Au moins une lettre de motivation',   done: apps.filter(a=>a.hasCoverLetter).length > 0 },
                    { label:'LinkedIn ou GitHub renseigné',        done: !!(profile?.linkedin_url || profile?.github_url) },
                    { label:'Disponibilité renseignée',            done: !!profile?.availability },
                    { label:'Alerte emploi configurée',            done: alertSaved },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${item.done ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${item.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {item.done ? Icon.check : <span className="text-xs font-black">{i+1}</span>}
                      </span>
                      <p className={`text-sm font-semibold ${item.done ? 'text-green-700 line-through opacity-60' : 'text-gray-700'}`}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// ─── Employer View ────────────────────────────────────────────────────────────

const CANDIDATE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:       { label: 'Nouveau',    color: 'bg-blue-50 text-blue-700 border-blue-200'    },
  reviewed:  { label: 'Examiné',    color: 'bg-violet-50 text-violet-700 border-violet-200' },
  shortlist: { label: 'Shortlist',  color: 'bg-amber-50 text-amber-700 border-amber-200'  },
  rejected:  { label: 'Refusé',     color: 'bg-red-50 text-red-600 border-red-200'        },
  hired:     { label: 'Embauché',   color: 'bg-green-50 text-green-700 border-green-200'  },
};

const EmployerView = ({ user }: { user: any }) => {
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [jobs, setJobs]                   = useState<any[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [selectedJob, setSelectedJob]     = useState<any>(null);
  const [jobCandidates, setJobCandidates] = useState<any[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [talentList, setTalentList]       = useState<any[]>([]);
  const [talentLoading, setTalentLoading] = useState(false);
  const [talentSearch, setTalentSearch]   = useState('');
  const [talentCity, setTalentCity]       = useState('');
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [publishForm, setPublishForm]     = useState({
    title: '', contractType: 'CDI', city: '', description: '', positions: '1',
  });
  const [publishing, setPublishing]       = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setLoading(false); return; }

        const { data: cp } = await supabase
          .from('company_profiles').select('*').eq('user_id', authUser.id).single();
        if (!cp) { setLoading(false); return; }
        setCompanyProfile(cp);

        const { data: jobOffers } = await supabase
          .from('job_offers')
          .select('id, title, is_active, contract_type, created_at, applications(count)')
          .eq('company_id', cp.id)
          .order('created_at', { ascending: false });

        setJobs((jobOffers || []).map((job: any) => ({
          id:              job.id,
          title:           job.title,
          contractType:    job.contract_type,
          isActive:        job.is_active !== false,
          createdAt:       job.created_at,
          candidatesCount: job.applications?.[0]?.count || 0,
        })));
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Charger les candidats d'une offre
  const loadJobCandidates = async (job: any) => {
    setSelectedJob(job);
    setActiveTab('jobs');
    setCandidatesLoading(true);
    try {
      const { data } = await supabase
        .from('applications')
        .select(`id, status, submitted_at, cover_letter,
          student_profiles(first_name, last_name, city, education_level, experience_years, skills, cv_url, phone)`)
        .eq('job_offer_id', job.id)
        .order('submitted_at', { ascending: false });
      setJobCandidates((data || []).map((a: any) => ({
        id:             a.id,
        status:         a.status || 'new',
        submittedAt:    a.submitted_at,
        hasCoverLetter: !!a.cover_letter,
        coverLetter:    a.cover_letter || '',
        firstName:      a.student_profiles?.first_name || '',
        lastName:       a.student_profiles?.last_name  || '',
        city:           a.student_profiles?.city || '',
        educationLevel: a.student_profiles?.education_level || '',
        experienceYears:a.student_profiles?.experience_years ?? null,
        skills:         a.student_profiles?.skills || [],
        cvUrl:          a.student_profiles?.cv_url || '',
        phone:          a.student_profiles?.phone || '',
      })));
    } catch {
      setJobCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  // Changer le statut d'un candidat
  const updateCandidateStatus = async (appId: string, newStatus: string) => {
    try {
      await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
      setJobCandidates(prev => prev.map(c => c.id === appId ? { ...c, status: newStatus } : c));
      toast.success('Statut mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Charger la CVthèque
  const loadTalent = async () => {
    setTalentLoading(true);
    try {
      let query = supabase
        .from('student_profiles')
        .select('id, first_name, last_name, city, education_level, experience_years, skills, availability, cv_url, field_of_study')
        .not('cv_url', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (talentCity) query = query.eq('city', talentCity);
      const { data } = await query;
      setTalentList(data || []);
    } catch {
      setTalentList([]);
    } finally {
      setTalentLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'talent') loadTalent();
  }, [activeTab, talentCity]);

  const filteredTalent = talentSearch
    ? talentList.filter(t => {
        const q = talentSearch.toLowerCase();
        const name = `${t.first_name} ${t.last_name}`.toLowerCase();
        const skills = (t.skills || []).join(' ').toLowerCase();
        const field = (t.field_of_study || '').toLowerCase();
        return name.includes(q) || skills.includes(q) || field.includes(q);
      })
    : talentList;

  // Publier une offre
  const handlePublish = async () => {
    if (!companyProfile) return;
    if (!publishForm.title || !publishForm.city) {
      toast.error('Titre et ville sont obligatoires');
      return;
    }
    setPublishing(true);
    try {
      const { error } = await supabase.from('job_offers').insert({
        company_id:    companyProfile.id,
        title:         publishForm.title,
        contract_type: publishForm.contractType,
        city:          publishForm.city,
        description:   publishForm.description,
        positions:     parseInt(publishForm.positions) || 1,
        is_active:     true,
      });
      if (error) throw error;
      toast.success('Offre publiée avec succès !');
      setShowPublishForm(false);
      setPublishForm({ title:'', contractType:'CDI', city:'', description:'', positions:'1' });
      // Recharger les offres
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser.user) {
        const { data: jobOffers } = await supabase
          .from('job_offers')
          .select('id, title, is_active, contract_type, created_at, applications(count)')
          .eq('company_id', companyProfile.id)
          .order('created_at', { ascending: false });
        setJobs((jobOffers || []).map((job: any) => ({
          id: job.id, title: job.title, contractType: job.contract_type,
          isActive: job.is_active !== false, createdAt: job.created_at,
          candidatesCount: job.applications?.[0]?.count || 0,
        })));
      }
    } catch {
      toast.error('Erreur lors de la publication');
    } finally {
      setPublishing(false);
    }
  };

  // Clore une offre
  const closeJob = async (jobId: string) => {
    try {
      await supabase.from('job_offers').update({ is_active: false }).eq('id', jobId);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isActive: false } : j));
      if (selectedJob?.id === jobId) setSelectedJob((s: any) => ({ ...s, isActive: false }));
      toast.success('Offre clôturée');
    } catch {
      toast.error('Erreur');
    }
  };

  const totalCandidates = jobs.reduce((s, j) => s + (j.candidatesCount || 0), 0);
  const activeJobs = jobs.filter(j => j.isActive).length;

  return (
    <div className="flex flex-col lg:flex-row gap-8">

      {/* Sidebar */}
      <aside className="lg:w-64 space-y-1.5 flex-shrink-0" aria-label="Navigation recruteur">
        <SidebarItem active={activeTab==='dashboard'} label="Tableau de bord" icon={Icon.chart}    onClick={() => { setActiveTab('dashboard'); setSelectedJob(null); }} />
        <SidebarItem active={activeTab==='jobs'}      label="Mes Offres"       icon={Icon.briefcase} badge={jobs.length} onClick={() => { setActiveTab('jobs'); setSelectedJob(null); }} />
        <SidebarItem active={activeTab==='talent'}    label="CVthèque"         icon={Icon.search}   onClick={() => setActiveTab('talent')} />
        <SidebarItem active={activeTab==='settings'}  label="Compte Entreprise" icon={Icon.building} onClick={() => setActiveTab('settings')} />

        {/* Résumé rapide */}
        {!loading && (
          <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Résumé</p>
            <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Offres actives</span><span className="font-black text-gray-900">{activeJobs}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Candidatures</span><span className="font-black text-gray-900">{totalCandidates}</span></div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 space-y-6">
        {loading && (
          <div className="flex justify-center py-20" role="status">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" aria-hidden="true" />
          </div>
        )}

        {!loading && (
          <>
            {/* ══════════════ TABLEAU DE BORD ══════════════ */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* KPI */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard title="Offres actives"    value={activeJobs}       icon={Icon.briefcase} color="blue"   />
                  <StatCard title="Candidatures"       value={totalCandidates} icon={Icon.people}    color="violet" />
                  <StatCard title="Compte"             value={companyProfile ? 'Complet' : 'Incomplet'} icon={Icon.building} color="green" />
                </div>

                {/* Offres populaires + upsell */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="font-black text-gray-900 mb-5">Performance des offres</h3>
                    {jobs.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400">Aucune offre publiée.</p>
                        <button onClick={() => setShowPublishForm(true)} className="mt-3 text-sm text-blue-600 font-bold hover:underline">
                          Publier votre première offre →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {jobs.slice(0,5).map(job => (
                          <div key={job.id} className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">{job.title}</p>
                              <p className="text-xs text-gray-400">{job.candidatesCount} candidat{job.candidatesCount !== 1 ? 's' : ''} · {job.contractType}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(((job.candidatesCount||0)/20)*100,100)}%` }} />
                              </div>
                              <button onClick={() => loadJobCandidates(job)} className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-wide">
                                Gérer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-black mb-2">Besoin de plus de visibilité ?</h3>
                      <p className="text-blue-100 text-sm">Boostez vos annonces pour apparaître en tête de liste pendant 7 jours et touchez 3× plus de candidats.</p>
                    </div>
                    <Link to="/nos-tarifs" className="bg-white text-blue-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs mt-6 self-start hover:bg-blue-50 transition-all inline-block">
                      Voir les offres Premium
                    </Link>
                  </div>
                </div>

                {/* CTA publier */}
                <div className="bg-blue-50 border border-blue-200 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-blue-900">Publiez une nouvelle offre d'emploi</h4>
                    <p className="text-sm text-blue-700 mt-0.5">Accédez aux meilleurs talents de la région Souss-Massa</p>
                  </div>
                  <button onClick={() => { setShowPublishForm(true); setActiveTab('jobs'); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all flex-shrink-0 flex items-center gap-2">
                    {Icon.plus} Publier une offre
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════ MES OFFRES ══════════════ */}
            {activeTab === 'jobs' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">
                      {selectedJob ? `Candidats — ${selectedJob.title}` : 'Gestion des offres'}
                    </h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {selectedJob
                        ? `${jobCandidates.length} candidature${jobCandidates.length !== 1 ? 's' : ''} reçue${jobCandidates.length !== 1 ? 's' : ''}`
                        : `${jobs.length} offre${jobs.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedJob && (
                      <button onClick={() => setSelectedJob(null)} className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-1">
                        {Icon.x} Retour
                      </button>
                    )}
                    <button onClick={() => setShowPublishForm(!showPublishForm)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-1">
                      {Icon.plus} Publier une offre
                    </button>
                  </div>
                </div>

                {/* Formulaire publication */}
                {showPublishForm && (
                  <div className="bg-white rounded-[2rem] border border-blue-200 shadow-sm p-6 sm:p-8 space-y-5">
                    <h3 className="font-black text-gray-900">Nouvelle offre d'emploi</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label htmlFor="pub-title" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Titre du poste *</label>
                        <input id="pub-title" type="text" value={publishForm.title} onChange={e => setPublishForm(f => ({ ...f, title: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex : Développeur Full-Stack, Comptable Senior" />
                      </div>
                      <div>
                        <label htmlFor="pub-contract" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Type de contrat</label>
                        <select id="pub-contract" value={publishForm.contractType} onChange={e => setPublishForm(f => ({ ...f, contractType: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                          {['CDI','CDD','Stage','Alternance','Freelance','Intérim'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="pub-city" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Ville *</label>
                        <select id="pub-city" value={publishForm.city} onChange={e => setPublishForm(f => ({ ...f, city: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                          <option value="">Choisir une ville</option>
                          {['Agadir','Inezgane','Taroudant','Tiznit','Essaouira','Marrakech','Casablanca'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="pub-positions" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Nombre de postes</label>
                        <input id="pub-positions" type="number" min="1" max="99" value={publishForm.positions} onChange={e => setPublishForm(f => ({ ...f, positions: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="pub-desc" className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Description du poste</label>
                        <textarea id="pub-desc" rows={5} value={publishForm.description} onChange={e => setPublishForm(f => ({ ...f, description: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                          placeholder="Décrivez les missions, les profils recherchés, les avantages…" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handlePublish} disabled={publishing} aria-busy={publishing}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-2">
                        {publishing ? 'Publication…' : `${Icon.send} Publier l'offre`}
                      </button>
                      <button onClick={() => setShowPublishForm(false)} className="bg-gray-100 text-gray-600 px-5 py-3 rounded-xl font-black text-sm hover:bg-gray-200 transition-all">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Vue candidats d'une offre */}
                {selectedJob ? (
                  <div className="space-y-4">
                    {/* Info offre sélectionnée */}
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 flex-shrink-0">{Icon.briefcase}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-blue-900">{selectedJob.title}</p>
                        <p className="text-xs text-blue-600">{selectedJob.contractType} · {jobCandidates.length} candidature{jobCandidates.length !== 1 ? 's' : ''}</p>
                      </div>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${selectedJob.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {selectedJob.isActive ? 'Active' : 'Clôturée'}
                      </span>
                    </div>

                    {candidatesLoading ? (
                      <div className="flex justify-center py-12" role="status">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true" />
                      </div>
                    ) : jobCandidates.length === 0 ? (
                      <EmptyState icon={Icon.people} title="Aucun candidat" description="Personne n'a encore postulé à cette offre." />
                    ) : (
                      <div className="space-y-3">
                        {jobCandidates.map(c => {
                          const statusCfg = CANDIDATE_STATUS_LABELS[c.status] || CANDIDATE_STATUS_LABELS.new;
                          const initials = `${c.firstName?.[0]||''}${c.lastName?.[0]||''}`.toUpperCase() || '??';
                          const colorIdx = (initials.charCodeAt(0) || 0) % AVATAR_COLORS.length;
                          return (
                            <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-blue-200 transition-all">
                              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${AVATAR_COLORS[colorIdx]}`} aria-hidden="true">
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <p className="font-black text-gray-900">{c.firstName} {c.lastName}</p>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusCfg.color}`}>{statusCfg.label}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                                    {c.city && <span className="flex items-center gap-1">{Icon.pin}{c.city}</span>}
                                    {c.educationLevel && <span>{c.educationLevel}</span>}
                                    {c.experienceYears != null && <span>{c.experienceYears} an{c.experienceYears > 1 ? 's' : ''} d'exp.</span>}
                                    <span className="text-gray-300">·</span>
                                    <span className="flex items-center gap-1">{Icon.clock}{timeAgo(c.submittedAt)}</span>
                                  </div>
                                  {c.skills?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                      {c.skills.slice(0,5).map((s: string) => (
                                        <span key={s} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100">{s}</span>
                                      ))}
                                    </div>
                                  )}
                                  {c.hasCoverLetter && (
                                    <details className="mb-3">
                                      <summary className="text-xs text-indigo-600 font-bold cursor-pointer hover:underline">Voir la lettre de motivation</summary>
                                      <p className="mt-2 text-xs text-gray-600 bg-indigo-50 p-3 rounded-xl border border-indigo-100">{c.coverLetter}</p>
                                    </details>
                                  )}
                                </div>
                                <div className="flex flex-col gap-2 flex-shrink-0">
                                  {c.cvUrl && (
                                    <a href={c.cvUrl} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors">
                                      {Icon.eye} CV
                                    </a>
                                  )}
                                  <select
                                    value={c.status}
                                    onChange={e => updateCandidateStatus(c.id, e.target.value)}
                                    aria-label={`Statut de ${c.firstName} ${c.lastName}`}
                                    className="text-xs border border-gray-200 rounded-xl px-3 py-2 font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                  >
                                    {Object.entries(CANDIDATE_STATUS_LABELS).map(([key, val]) => (
                                      <option key={key} value={key}>{val.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Liste des offres */
                  jobs.length === 0 ? (
                    <EmptyState icon={Icon.briefcase} title="Aucune offre publiée" description="Publiez votre première offre pour commencer à recevoir des candidatures." />
                  ) : (
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                      <table className="w-full text-left" role="table">
                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Poste</th>
                            <th className="px-6 py-4 text-center">Candidats</th>
                            <th className="px-6 py-4">Statut</th>
                            <th className="px-6 py-4 hidden sm:table-cell">Publiée</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {jobs.map(job => (
                            <tr key={job.id} className="hover:bg-gray-50/50 transition-all">
                              <td className="px-6 py-5">
                                <p className="font-bold text-gray-900">{job.title}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{job.contractType}</p>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <span className={`text-sm font-black ${job.candidatesCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{job.candidatesCount}</span>
                              </td>
                              <td className="px-6 py-5">
                                <span className={`text-[10px] px-3 py-1 rounded-full font-black border ${job.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  {job.isActive ? 'Active' : 'Clôturée'}
                                </span>
                              </td>
                              <td className="px-6 py-5 hidden sm:table-cell text-xs text-gray-400">{timeAgo(job.createdAt)}</td>
                              <td className="px-6 py-5 text-right space-x-3">
                                <button onClick={() => loadJobCandidates(job)} className="text-blue-600 hover:underline font-black text-[10px] uppercase tracking-widest">
                                  Candidats ({job.candidatesCount})
                                </button>
                                {job.isActive && (
                                  <button onClick={() => closeJob(job.id)} className="text-red-400 hover:text-red-600 font-black text-[10px] uppercase tracking-widest">
                                    Clore
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            )}

            {/* ══════════════ CVTHÈQUE ══════════════ */}
            {activeTab === 'talent' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">CVthèque</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Parcourez les profils de candidats disponibles dans la région</p>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label htmlFor="talent-search" className="sr-only">Rechercher un talent</label>
                    <div className="relative">
                      <input id="talent-search" type="search" value={talentSearch} onChange={e => setTalentSearch(e.target.value)}
                        placeholder="Nom, compétence, domaine…"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <span className="absolute left-3 top-3.5 text-gray-400">{Icon.search}</span>
                    </div>
                  </div>
                  <div className="sm:w-48">
                    <label htmlFor="talent-city" className="sr-only">Filtrer par ville</label>
                    <select id="talent-city" value={talentCity} onChange={e => setTalentCity(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="">Toutes les villes</option>
                      {['Agadir','Inezgane','Taroudant','Tiznit','Essaouira','Marrakech'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {talentLoading ? (
                  <div className="flex justify-center py-16" role="status">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true" />
                  </div>
                ) : filteredTalent.length === 0 ? (
                  <EmptyState icon={Icon.people} title="Aucun profil trouvé" description="Modifiez vos critères de recherche ou revenez plus tard." />
                ) : (
                  <>
                    <p className="text-sm text-gray-500 font-medium" aria-live="polite">{filteredTalent.length} profil{filteredTalent.length > 1 ? 's' : ''} trouvé{filteredTalent.length > 1 ? 's' : ''}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredTalent.map(talent => {
                        const initials = `${talent.first_name?.[0]||''}${talent.last_name?.[0]||''}`.toUpperCase() || '??';
                        const colorIdx = (initials.charCodeAt(0)||0) % AVATAR_COLORS.length;
                        return (
                          <div key={talent.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition-all">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${AVATAR_COLORS[colorIdx]}`} aria-hidden="true">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-gray-900">{talent.first_name} {talent.last_name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {talent.field_of_study || talent.education_level || 'Profil candidat'}
                                  {talent.experience_years != null && ` · ${talent.experience_years} an${talent.experience_years > 1 ? 's' : ''}`}
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {talent.city && (
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">{Icon.pin}{talent.city}</span>
                                  )}
                                  {talent.availability && (
                                    <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-200">{talent.availability}</span>
                                  )}
                                </div>
                                {talent.skills?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {talent.skills.slice(0,4).map((s: string) => (
                                      <span key={s} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">{s}</span>
                                    ))}
                                    {talent.skills.length > 4 && <span className="text-[10px] text-gray-400 font-bold">+{talent.skills.length-4}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            {talent.cv_url && (
                              <div className="mt-4 pt-3 border-t border-gray-50 flex gap-2">
                                <a href={talent.cv_url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                                  {Icon.cv} Voir le CV
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══════════════ COMPTE ENTREPRISE ══════════════ */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Compte Entreprise</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Informations visibles par les candidats</p>
                  </div>
                  <Link to="/profil" className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">
                    Modifier le profil
                  </Link>
                </div>

                {!companyProfile ? (
                  <EmptyState icon={Icon.building} title="Profil entreprise introuvable" description="Complétez votre inscription pour accéder à votre profil entreprise." actionLabel="Compléter" actionHref="/profil" />
                ) : (
                  <>
                    {/* Carte identité */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0" aria-hidden="true">
                          {(companyProfile.company_name?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-2xl font-black text-gray-900">{companyProfile.company_name}</h3>
                          {companyProfile.sector && <p className="text-gray-500 font-medium mt-0.5">{companyProfile.sector}</p>}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {companyProfile.city && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-semibold flex items-center gap-1">{Icon.pin}{companyProfile.city}</span>
                            )}
                            {companyProfile.company_size && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-semibold">{companyProfile.company_size} employés</span>
                            )}
                            {companyProfile.is_verified && (
                              <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-semibold border border-green-200 flex items-center gap-1">{Icon.check} Vérifié</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {companyProfile.description && (
                        <p className="mt-6 text-sm text-gray-600 leading-relaxed">{companyProfile.description}</p>
                      )}
                    </div>

                    {/* Informations de contact */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <h4 className="font-black text-gray-900 mb-4">Coordonnées</h4>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { label:'Email',     value: companyProfile.email   || user?.email },
                          { label:'Téléphone', value: companyProfile.phone   },
                          { label:'Ville',     value: companyProfile.city    },
                          { label:'Adresse',   value: companyProfile.address },
                        ].filter(i => i.value).map(item => (
                          <div key={item.label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                            <div>
                              <dt className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{item.label}</dt>
                              <dd className="text-sm font-bold text-gray-800 mt-0.5">{item.value}</dd>
                            </div>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Statut du compte */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <h4 className="font-black text-gray-900 mb-4">Statut du compte</h4>
                      <div className="space-y-3">
                        {[
                          { label:'Profil complété',  done: user?.isProfileComplete },
                          { label:'Entreprise vérifiée', done: !!companyProfile.is_verified },
                          { label:'Document légal uploadé', done: !!companyProfile.document_url },
                          { label:'Description renseignée', done: !!companyProfile.description },
                          { label:'Logo uploadé',    done: !!companyProfile.logo_url },
                        ].map((item, i) => (
                          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${item.done ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
                            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${item.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                              {item.done ? Icon.check : <span className="text-xs font-black">{i+1}</span>}
                            </span>
                            <p className={`text-sm font-semibold ${item.done ? 'text-green-700 line-through opacity-60' : 'text-gray-700'}`}>{item.label}</p>
                          </div>
                        ))}
                      </div>
                      {companyProfile.document_url && (
                        <div className="mt-4">
                          <a href={companyProfile.document_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
                            {Icon.eye} Voir le document légal
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// ─── Dashboard Entry ──────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/connexion" />;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-gray-100 py-10 px-4 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tighter">
              Ravi de vous revoir, <span className="text-blue-600">{user?.name}</span> !
            </h1>
            <p className="text-gray-500 font-medium mt-1 text-sm">
              {user?.role === 'student'
                ? 'Propulsez votre carrière avec nos dernières opportunités.'
                : 'Gérez vos recrutements et trouvez les meilleurs talents du Maroc.'}
            </p>
          </div>
          <div className="flex items-center space-x-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shadow-inner">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl font-black text-blue-600" aria-hidden="true">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="pr-4">
              <p className="text-xs font-black text-gray-900 uppercase tracking-widest">
                {user?.role === 'student' ? 'Compte Candidat' : 'Compte Entreprise'}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20">
        {user?.role === 'student' ? <CandidateView user={user} /> : <EmployerView user={user} />}
      </div>
    </div>
  );
};

export default Dashboard;
