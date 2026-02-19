import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../src/services/supabase';

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  soumise:   { label: 'Soumise',      bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-500'    },
  en_cours:  { label: 'En cours',     bg: 'bg-violet-50',  text: 'text-violet-600',  dot: 'bg-violet-500'  },
  entretien: { label: 'Entretien',    bg: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-500'   },
  refusee:   { label: 'Refusée',      bg: 'bg-red-50',     text: 'text-red-500',     dot: 'bg-red-400'     },
  embauchee: { label: 'Embauchée !',  bg: 'bg-green-50',   text: 'text-green-600',   dot: 'bg-green-500'   },
};

const PIPELINE_STAGES = ['soumise', 'en_cours', 'entretien', 'embauchee'] as const;

const CONTRACT_LABELS: Record<string, string> = {
  stage: 'Stage', cdi: 'CDI', cdd: 'CDD',
  freelance: 'Freelance', alternance: 'Alternance', interim: 'Intérim',
};

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];

function normalizeStatus(s: string): string {
  if (!s) return 'soumise';
  const l = s.toLowerCase().replace(' ', '_');
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
    [!!p.phone, 10],
    [!!p.city, 5],
    [!!p.education_level, 10],
    [!!p.field_of_study, 10],
    [!!(p.skills?.length > 0), 15],
    [p.experience_years != null, 5],
    [!!p.cv_url, 20],
    [!!(p.linkedin_url || p.github_url), 5],
    [!!p.availability, 5],
  ];
  return checks.reduce((sum, [c, w]) => sum + (c ? w : 0), 0);
}

// ─── Base components (shared by both views) ──────────────────────────────────

const StatCard = ({
  title, value, icon, trend, sub,
}: {
  title: string; value: string | number; icon: string; trend?: string; sub?: string;
}) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">{icon}</div>
      {trend && <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">{trend}</span>}
    </div>
    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
    <p className="text-3xl font-black text-gray-900 mt-1">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const SidebarItem = ({
  active, label, icon, badge, onClick,
}: {
  active: boolean; label: string; icon: string; badge?: number; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <div className="flex items-center space-x-3">
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </div>
    {badge != null && badge > 0 && (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
        active ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
      }`}>{badge}</span>
    )}
  </button>
);

const EmptyState = ({
  icon, title, description, actionLabel, actionHref,
}: {
  icon: string; title: string; description: string; actionLabel?: string; actionHref?: string;
}) => (
  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 text-center space-y-4">
    <div className="text-5xl">{icon}</div>
    <h3 className="text-xl font-black text-gray-900">{title}</h3>
    <p className="text-gray-500 max-w-sm mx-auto">{description}</p>
    {actionLabel && actionHref && (
      <Link
        to={actionHref}
        className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all"
      >
        {actionLabel}
      </Link>
    )}
  </div>
);

// ─── Candidate-specific components ───────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.soumise;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const AppPipeline = ({ status }: { status: string }) => {
  const isRefused = status === 'refusee';
  const currentIdx = PIPELINE_STAGES.indexOf(status as any);
  return (
    <div className="flex items-center space-x-1">
      {PIPELINE_STAGES.map((stage, i) => (
        <React.Fragment key={stage}>
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              isRefused ? 'bg-red-200' : i <= currentIdx ? 'bg-blue-500' : 'bg-gray-200'
            }`}
            title={STATUS_CONFIG[stage]?.label}
          />
          {i < PIPELINE_STAGES.length - 1 && (
            <div className={`h-px w-5 ${
              isRefused ? 'bg-red-100' : i < currentIdx ? 'bg-blue-500' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const AppCard = ({ app }: { app: any }) => {
  const initials = (app.company || '?').slice(0, 2).toUpperCase();
  const colorIdx = (initials.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-gray-50/60 transition-colors rounded-2xl">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${AVATAR_COLORS[colorIdx]}`}>
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
              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                ✓ Vu
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <AppPipeline status={app.status} />
          <p className="text-[10px] text-gray-400 font-medium mt-1">{app.date}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>
    </div>
  );
};

// ─── Candidate View ───────────────────────────────────────────────────────────

const CandidateView = ({ user: _user }: { user: any }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [apps, setApps] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appFilter, setAppFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: studentProfile } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (!studentProfile) return;
        setProfile(studentProfile);

        const { data: applications } = await supabase
          .from('applications')
          .select(`
            id, status, submitted_at, viewed_by_company, cover_letter,
            job_offers(id, title, contract_type, work_type, company_profiles(company_name))
          `)
          .eq('student_id', studentProfile.id)
          .order('submitted_at', { ascending: false });

        setApps((applications || []).map((app: any) => ({
          id: app.id,
          offerTitle: app.job_offers?.title || 'Offre inconnue',
          company: app.job_offers?.company_profiles?.company_name || '',
          contractType: app.job_offers?.contract_type || '',
          workType: app.job_offers?.work_type || '',
          status: normalizeStatus(app.status),
          date: new Date(app.submitted_at).toLocaleDateString('fr-FR'),
          viewedByCompany: app.viewed_by_company,
          hasCoverLetter: !!app.cover_letter,
        })));
      } catch {
        setApps([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Computed stats ──
  const totalApps = apps.length;
  const responseCount = apps.filter(a => ['en_cours', 'entretien', 'refusee', 'embauchee'].includes(a.status)).length;
  const interviewCount = apps.filter(a => a.status === 'entretien').length;
  const hiredCount = apps.filter(a => a.status === 'embauchee').length;
  const refusedCount = apps.filter(a => a.status === 'refusee').length;
  const responseRate = totalApps > 0 ? Math.round((responseCount / totalApps) * 100) : 0;
  const profileScore = getProfileScore(profile);

  const pipelineCounts = {
    soumise: apps.filter(a => a.status === 'soumise').length,
    en_cours: apps.filter(a => a.status === 'en_cours').length,
    entretien: interviewCount,
    embauchee: hiredCount,
    refusee: refusedCount,
  };

  const activeAppsCount = apps.filter(a => ['soumise', 'en_cours', 'entretien'].includes(a.status)).length;

  const FILTERS = [
    { key: 'all',       label: `Toutes (${totalApps})` },
    { key: 'active',    label: `Actives (${activeAppsCount})` },
    { key: 'entretien', label: `Entretiens (${interviewCount})` },
    { key: 'embauchee', label: `Embauchée (${hiredCount})` },
    { key: 'refusee',   label: `Refusées (${refusedCount})` },
  ];

  const filteredApps = appFilter === 'all'
    ? apps
    : appFilter === 'active'
    ? apps.filter(a => ['soumise', 'en_cours', 'entretien'].includes(a.status))
    : apps.filter(a => a.status === appFilter);

  const missingFields = profile ? [
    !profile.phone && 'Téléphone',
    !profile.city && 'Ville',
    !profile.education_level && 'Niveau d\'études',
    !profile.field_of_study && 'Domaine d\'études',
    !(profile.skills?.length > 0) && 'Compétences',
    !profile.cv_url && 'CV',
    !(profile.linkedin_url || profile.github_url) && 'Lien professionnel',
    !profile.availability && 'Disponibilité',
  ].filter(Boolean) as string[] : [];

  return (
    <div className="flex flex-col lg:flex-row gap-8">

      {/* ── Sidebar ── */}
      <aside className="lg:w-64 space-y-1.5 flex-shrink-0">
        <SidebarItem active={activeTab === 'overview'}  label="Aperçu"          icon="📊" onClick={() => setActiveTab('overview')} />
        <SidebarItem active={activeTab === 'apps'}      label="Candidatures"    icon="📋" badge={totalApps} onClick={() => setActiveTab('apps')} />
        <SidebarItem active={activeTab === 'profile'}   label="Mon Profil"      icon="👤" onClick={() => setActiveTab('profile')} />
        <SidebarItem active={activeTab === 'docs'}      label="Documents"       icon="📂" onClick={() => setActiveTab('docs')} />
        <SidebarItem active={activeTab === 'alerts'}    label="Alertes Emploi"  icon="🔔" onClick={() => setActiveTab('alerts')} />

        {/* Profile score widget */}
        {profile && (
          <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Force du profil</p>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-black text-gray-800">{profileScore}%</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                profileScore === 100 ? 'bg-green-50 text-green-600' :
                profileScore >= 60  ? 'bg-blue-50 text-blue-600' :
                                      'bg-amber-50 text-amber-600'
              }`}>
                {profileScore === 100 ? 'Excellent' : profileScore >= 60 ? 'Bon' : 'À améliorer'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  profileScore === 100 ? 'bg-green-500' :
                  profileScore >= 60  ? 'bg-blue-500' : 'bg-amber-400'
                }`}
                style={{ width: `${profileScore}%` }}
              />
            </div>
            {profileScore < 100 && (
              <button
                onClick={() => setActiveTab('profile')}
                className="text-xs text-blue-600 font-bold mt-2 hover:underline"
              >
                Améliorer mon profil →
              </button>
            )}
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 space-y-6">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        )}

        {!loading && (
          <>
            {/* ════════════════════════════════════ APERÇU ══════════════════════════════════ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">

                {/* Profile completion banner */}
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
                            {missingFields.slice(0, 4).map(f => (
                              <span key={f} className="text-[10px] bg-white/20 px-2.5 py-1 rounded-full font-bold">
                                {f} manquant
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl font-black">{profileScore}%</span>
                        </div>
                        <button
                          onClick={() => setActiveTab('profile')}
                          className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex-shrink-0"
                        >
                          Compléter
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${profileScore}%` }} />
                    </div>
                  </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Candidatures" value={totalApps}         icon="📋" />
                  <StatCard title="Réponses"     value={responseCount}     icon="💬" />
                  <StatCard title="Taux réponse" value={`${responseRate}%`} icon="📈" />
                  <StatCard title="Entretiens"   value={interviewCount}    icon="🤝" />
                </div>

                {/* Application pipeline visual */}
                {totalApps > 0 && (
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
                    <h3 className="font-black text-gray-900 mb-5">Pipeline de candidatures</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { key: 'soumise',   label: 'Soumise',   icon: '📨', color: 'text-blue-600',   bg: 'bg-blue-50'   },
                        { key: 'en_cours',  label: 'En cours',  icon: '⏳', color: 'text-violet-600', bg: 'bg-violet-50' },
                        { key: 'entretien', label: 'Entretien', icon: '💬', color: 'text-amber-600',  bg: 'bg-amber-50'  },
                        { key: 'embauchee', label: 'Embauchée', icon: '🎉', color: 'text-green-600',  bg: 'bg-green-50'  },
                        { key: 'refusee',   label: 'Refusée',   icon: '❌', color: 'text-red-500',    bg: 'bg-red-50'    },
                      ].map(stage => (
                        <div key={stage.key} className={`text-center p-3 rounded-2xl ${stage.bg}`}>
                          <div className="text-xl mb-1">{stage.icon}</div>
                          <div className={`text-2xl font-black ${stage.color}`}>
                            {pipelineCounts[stage.key as keyof typeof pipelineCounts]}
                          </div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-0.5 leading-tight">
                            {stage.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent applications */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <h3 className="font-black text-gray-900">Dernières candidatures</h3>
                    <div className="flex items-center gap-3">
                      {totalApps > 3 && (
                        <button
                          onClick={() => setActiveTab('apps')}
                          className="text-xs font-bold text-blue-600 hover:underline"
                        >
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
                      {apps.slice(0, 4).map(app => <AppCard key={app.id} app={app} />)}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link
                    to="/offres"
                    className="bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-5 flex items-center gap-4 transition-all group"
                  >
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl group-hover:bg-blue-100 transition-colors flex-shrink-0">🔍</div>
                    <div>
                      <p className="font-black text-sm text-gray-900">Explorer les offres</p>
                      <p className="text-xs text-gray-400 mt-0.5">Trouvez votre prochain poste</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-5 flex items-center gap-4 transition-all group text-left"
                  >
                    <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-xl group-hover:bg-purple-100 transition-colors flex-shrink-0">✏️</div>
                    <div>
                      <p className="font-black text-sm text-gray-900">Mettre à jour mon profil</p>
                      <p className="text-xs text-gray-400 mt-0.5">Profil à {profileScore}%</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('docs')}
                    className="bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-5 flex items-center gap-4 transition-all group text-left"
                  >
                    <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center text-xl group-hover:bg-green-100 transition-colors flex-shrink-0">📄</div>
                    <div>
                      <p className="font-black text-sm text-gray-900">Mon CV</p>
                      <p className="text-xs text-gray-400 mt-0.5">{profile?.cv_url ? 'CV en ligne ✓' : 'Ajouter un CV'}</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════ CANDIDATURES ════════════════════════════════ */}
            {activeTab === 'apps' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Mes candidatures</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{totalApps} candidature{totalApps > 1 ? 's' : ''} au total</p>
                  </div>
                  <Link
                    to="/offres"
                    className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                  >
                    + Postuler
                  </Link>
                </div>

                {/* Filter chips */}
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setAppFilter(f.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        appFilter === f.key
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                          : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Pipeline legend */}
                {totalApps > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pipeline :</span>
                    {PIPELINE_STAGES.map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                        {i > 0 && <span className="text-gray-300 text-xs">→</span>}
                        <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                        {STATUS_CONFIG[s].label}
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 sm:ml-auto">
                      <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG.refusee.dot}`} />
                      {STATUS_CONFIG.refusee.label}
                    </div>
                  </div>
                )}

                {/* Applications list */}
                {filteredApps.length === 0 ? (
                  <EmptyState
                    icon="📭"
                    title="Aucune candidature ici"
                    description={
                      appFilter === 'all'
                        ? 'Commencez à postuler pour voir votre historique.'
                        : 'Aucune candidature dans cette catégorie.'
                    }
                    actionLabel="Parcourir les offres"
                    actionHref="/offres"
                  />
                ) : (
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-50/80 px-2">
                      {filteredApps.map(app => <AppCard key={app.id} app={app} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════ MON PROFIL ══════════════════════════════════ */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Mon Profil</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Visible par les recruteurs</p>
                  </div>
                  <Link
                    to="/profil"
                    className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                  >
                    ✏️ Modifier le profil
                  </Link>
                </div>

                {!profile ? (
                  <EmptyState
                    icon="👤"
                    title="Profil introuvable"
                    description="Complétez votre inscription pour accéder à votre profil."
                    actionLabel="Compléter le profil"
                    actionHref="/profil"
                  />
                ) : (
                  <>
                    {/* Profile header */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0">
                          {(profile.first_name?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-2xl font-black text-gray-900 leading-tight">
                            {profile.first_name} {profile.last_name}
                          </h3>
                          <p className="text-gray-500 font-medium mt-0.5">
                            {profile.field_of_study || 'Domaine non renseigné'}
                            {profile.education_level && ` • ${profile.education_level}`}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {profile.city && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-semibold">
                                📍 {profile.city}
                              </span>
                            )}
                            {profile.experience_years != null && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-semibold">
                                💼 {profile.experience_years} an{profile.experience_years > 1 ? 's' : ''} d&apos;expérience
                              </span>
                            )}
                            {profile.availability && (
                              <span className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full font-semibold">
                                ✅ {profile.availability}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-3xl font-black ${
                            profileScore === 100 ? 'text-green-500' :
                            profileScore >= 60  ? 'text-blue-600' : 'text-amber-500'
                          }`}>{profileScore}%</div>
                          <p className="text-xs text-gray-400 font-semibold">Complété</p>
                        </div>
                      </div>

                      {/* Completion bar */}
                      <div className="mt-6 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            profileScore === 100 ? 'bg-green-500' :
                            profileScore >= 60  ? 'bg-blue-500' : 'bg-amber-400'
                          }`}
                          style={{ width: `${profileScore}%` }}
                        />
                      </div>

                      {missingFields.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                          <span className="text-xs text-gray-400 font-semibold">À compléter :</span>
                          {missingFields.map(f => (
                            <span key={f} className="text-[10px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-bold">{f}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {profile.skills?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h4 className="font-black text-gray-900 mb-4">Compétences</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill: string) => (
                            <span key={skill} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-sm font-bold">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
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

                    {/* Contact info */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <h4 className="font-black text-gray-900 mb-4">Informations de contact</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { label: 'Téléphone',    value: profile.phone,        icon: '📞' },
                          { label: 'Ville',        value: profile.city,         icon: '📍' },
                          { label: 'Adresse',      value: profile.address,      icon: '🏠' },
                          { label: 'Disponibilité',value: profile.availability, icon: '📅' },
                        ].filter(i => i.value).map(item => (
                          <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <span className="text-lg">{item.icon}</span>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{item.label}</p>
                              <p className="text-sm font-bold text-gray-800">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Professional links */}
                    {(profile.linkedin_url || profile.github_url || profile.portfolio_url) && (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h4 className="font-black text-gray-900 mb-4">Liens professionnels</h4>
                        <div className="flex flex-wrap gap-3">
                          {profile.linkedin_url && (
                            <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
                              LinkedIn
                            </a>
                          )}
                          {profile.github_url && (
                            <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-900 transition-colors">
                              GitHub
                            </a>
                          )}
                          {profile.portfolio_url && (
                            <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors">
                              Portfolio
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ════════════════════════════════ DOCUMENTS ═══════════════════════════════════ */}
            {activeTab === 'docs' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-gray-900">Documents</h2>

                {/* CV card */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">📄</div>
                      <div>
                        <h4 className="font-black text-gray-900 text-lg">Mon CV</h4>
                        {profile?.cv_url ? (
                          <>
                            <p className="text-sm text-gray-500 mt-0.5">CV téléchargé et disponible pour les recruteurs</p>
                            <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-bold mt-2 inline-block">✓ En ligne</span>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-500 mt-0.5">Aucun CV téléchargé</p>
                            <span className="text-[10px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-bold mt-2 inline-block">⚠ Manquant</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Link
                      to="/profil"
                      className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex-shrink-0"
                    >
                      {profile?.cv_url ? 'Mettre à jour' : 'Ajouter un CV'}
                    </Link>
                  </div>

                  {!profile?.cv_url && (
                    <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <p className="text-sm font-bold text-amber-700">💡 Conseil</p>
                      <p className="text-xs text-amber-600 mt-1">
                        Un CV en ligne augmente vos chances de réponse de 80%. Ajoutez-le depuis votre page profil.
                      </p>
                    </div>
                  )}
                </div>

                {/* Cover letters overview */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2rem] border border-indigo-100 p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">✍️</div>
                    <div className="flex-1">
                      <h4 className="font-black text-gray-900">Lettres de motivation</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Ajoutez une lettre personnalisée à chaque candidature depuis la page de l&apos;offre.
                      </p>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm font-bold text-indigo-700 mb-1.5">
                          <span>{apps.filter(a => a.hasCoverLetter).length} / {totalApps} candidatures avec lettre</span>
                          <span>{totalApps > 0 ? Math.round((apps.filter(a => a.hasCoverLetter).length / totalApps) * 100) : 0}%</span>
                        </div>
                        <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                            style={{ width: totalApps > 0 ? `${(apps.filter(a => a.hasCoverLetter).length / totalApps) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════ ALERTES ═════════════════════════════════════ */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-gray-900">Alertes Emploi</h2>

                {/* Hero alert card */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white">
                  <div className="text-4xl mb-4">🔔</div>
                  <h3 className="text-2xl font-black mb-2">Ne ratez plus aucune opportunité</h3>
                  <p className="text-blue-100 mb-6">
                    Soyez parmi les premiers à postuler aux offres correspondant à votre profil dans la région Souss-Massa.
                  </p>
                  {profile && (
                    <div className="bg-white/10 rounded-2xl p-4 mb-6">
                      <p className="text-xs font-black uppercase tracking-widest text-blue-200 mb-3">
                        Vos critères suggérés
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {profile.city && (
                          <span className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-bold">📍 {profile.city}</span>
                        )}
                        {profile.skills?.slice(0, 3).map((s: string) => (
                          <span key={s} className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-bold">{s}</span>
                        ))}
                        {profile.education_level && (
                          <span className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-full font-bold">{profile.education_level}</span>
                        )}
                      </div>
                    </div>
                  )}
                  <Link
                    to="/offres"
                    className="inline-block bg-white text-blue-600 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all"
                  >
                    Explorer les offres correspondantes
                  </Link>
                </div>

                {/* Career stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center">
                    <div className="text-3xl font-black text-blue-600">{totalApps}</div>
                    <div className="text-xs font-black text-gray-400 uppercase tracking-wider mt-1">Candidatures envoyées</div>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center">
                    <div className="text-3xl font-black text-amber-500">{interviewCount}</div>
                    <div className="text-xs font-black text-gray-400 uppercase tracking-wider mt-1">Entretiens obtenus</div>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center">
                    <div className="text-3xl font-black text-green-500">{hiredCount}</div>
                    <div className="text-xs font-black text-gray-400 uppercase tracking-wider mt-1">Embauche{hiredCount > 1 ? 's' : ''}</div>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <h4 className="font-black text-gray-900">Conseils pour augmenter vos chances</h4>
                  {[
                    { icon: '📄', tip: 'Ajoutez un CV à jour pour que les recruteurs vous trouvent plus facilement.', done: !!profile?.cv_url },
                    { icon: '✍️', tip: 'Personnalisez votre lettre de motivation pour chaque candidature.', done: apps.filter(a => a.hasCoverLetter).length > 0 },
                    { icon: '💼', tip: 'Complétez vos expériences et compétences dans votre profil.', done: profileScore >= 80 },
                    { icon: '🔗', tip: 'Ajoutez votre LinkedIn ou GitHub pour renforcer votre crédibilité.', done: !!(profile?.linkedin_url || profile?.github_url) },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${item.done ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <span className="text-lg flex-shrink-0">{item.done ? '✅' : item.icon}</span>
                      <p className={`text-sm font-semibold ${item.done ? 'text-green-700 line-through opacity-60' : 'text-gray-700'}`}>{item.tip}</p>
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

// ─── Employer View (unchanged) ────────────────────────────────────────────────

const EmployerView = ({ user }: { user: any }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setLoading(false); return; }

        const { data: companyProfile } = await supabase
          .from('company_profiles')
          .select('id')
          .eq('user_id', authUser.id)
          .single();

        if (!companyProfile) { setLoading(false); return; }

        const { data: jobOffers } = await supabase
          .from('job_offers')
          .select(`id, title, is_active, applications(count)`)
          .eq('company_id', companyProfile.id)
          .order('created_at', { ascending: false });

        const mapped = (jobOffers || []).map((job: any) => ({
          id: job.id,
          title: job.title,
          candidatesCount: job.applications?.[0]?.count || 0,
        }));
        setJobs(mapped);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-64 space-y-2">
        <SidebarItem active={activeTab === 'dashboard'} label="Recrutement" icon="📈" onClick={() => setActiveTab('dashboard')} />
        <SidebarItem active={activeTab === 'jobs'} label="Mes Offres" icon="💼" onClick={() => setActiveTab('jobs')} />
        <SidebarItem active={activeTab === 'talent'} label="CVthèque" icon="🔍" onClick={() => setActiveTab('talent')} />
        <SidebarItem active={activeTab === 'settings'} label="Compte Entreprise" icon="🏢" onClick={() => setActiveTab('settings')} />
      </aside>

      <main className="flex-1 space-y-8">
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Offres Actives" value={jobs.length} icon="📢" />
              <StatCard title="Candidats Totaux" value={jobs.reduce((sum, j) => sum + (j.candidatesCount || 0), 0)} icon="👥" />
              <StatCard title="Statut Compte" value={user?.isProfileComplete ? 'Complet' : 'Incomplet'} icon="🏢" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="font-black text-gray-900 mb-6">Offres les plus populaires</h3>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Aucune offre publiée.</p>
                ) : (
                  <div className="space-y-6">
                    {jobs.map(job => (
                      <div key={job.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{job.title}</p>
                          <p className="text-xs text-gray-400 font-medium">{job.views || 0} vues &bull; {job.candidatesCount || 0} candidats</p>
                        </div>
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: `${Math.min(((job.candidatesCount || 0) / 50) * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black mb-2">Besoin de plus de visibilité ?</h3>
                  <p className="text-blue-100 text-sm opacity-80">Boostez vos annonces pour apparaître en tête de liste pendant 7 jours.</p>
                </div>
                <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs mt-6 self-start hover:bg-blue-50 transition-all">
                  Passer en Premium
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'jobs' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-black text-xl text-gray-900">Gestion des Annonces</h3>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all">
                Publier une offre
              </button>
            </div>
            {jobs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="font-medium">Aucune offre publiée pour le moment.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4">Titre de l&apos;offre</th>
                    <th className="px-8 py-4 text-center">Candidats</th>
                    <th className="px-8 py-4">Statut</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {jobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <p className="font-bold text-gray-900">{job.title}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Réf: {String(job.id).toUpperCase()}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="font-black text-gray-900">{job.candidatesCount || 0}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Actif</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="text-gray-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mr-4">Gérer</button>
                        <button className="text-gray-400 hover:text-red-500 font-black text-[10px] uppercase tracking-widest">Clore</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
      <div className="bg-white border-b border-gray-100 py-12 px-4 mb-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
              Ravi de vous revoir, <span className="text-blue-600">{user?.name}</span> !
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              {user?.role === 'student'
                ? 'Propulsez votre carrière avec nos dernières opportunités.'
                : 'Gérez vos recrutements et trouvez les meilleurs talents du Maroc.'}
            </p>
          </div>
          <div className="flex items-center space-x-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shadow-inner">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl font-black text-blue-600">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="pr-4">
              <p className="text-xs font-black text-gray-900 uppercase tracking-widest">
                {user?.role === 'student' ? 'Compte Étudiant' : 'Compte Entreprise'}
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
