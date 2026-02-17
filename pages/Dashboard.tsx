import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { apiService } from '../services/apiService';

// --- Composants Réutilisables ---

const StatCard = ({ title, value, icon, trend }: { title: string, value: string | number, icon: string, trend?: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl">
        {icon}
      </div>
      {trend && <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">{trend}</span>}
    </div>
    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
    <p className="text-3xl font-black text-gray-900 mt-1">{value}</p>
  </div>
);

const SidebarItem = ({ active, label, icon, onClick }: { active: boolean, label: string, icon: any, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <span className="text-xl">{icon}</span>
    <span>{label}</span>
  </button>
);

// --- Vue Candidat ---

const CandidateView = ({ user }: { user: any }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await apiService.getApplications();
      setApps(data.length ? data : [
        { id: 1, offerTitle: 'Frontend Engineer', company: 'OCP', status: 'Entretien', date: '12/05' },
        { id: 2, offerTitle: 'UI Designer', company: 'Maroc Telecom', status: 'Envoyée', date: '10/05' }
      ]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Local */}
      <aside className="lg:w-64 space-y-2">
        <SidebarItem active={activeTab === 'overview'} label="Aperçu" icon="📊" onClick={() => setActiveTab('overview')} />
        <SidebarItem active={activeTab === 'apps'} label="Candidatures" icon="📩" onClick={() => setActiveTab('apps')} />
        <SidebarItem active={activeTab === 'profile'} label="Mon Profil AI" icon="👤" onClick={() => setActiveTab('profile')} />
        <SidebarItem active={activeTab === 'docs'} label="Coffre-fort CV" icon="📎" onClick={() => setActiveTab('docs')} />
      </aside>

      {/* Content */}
      <main className="flex-1 space-y-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Candidatures" value={apps.length} icon="📝" trend="+2 cette semaine" />
              <StatCard title="Entretiens" value="3" icon="🤝" />
              <StatCard title="Vues Profil" value="124" icon="👁️" trend="+15%" />
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <h3 className="font-black text-gray-900">Dernières Activités</h3>
                <Link to="/offres" className="text-xs font-bold text-blue-600 hover:underline">Trouver plus d'offres</Link>
              </div>
              <div className="divide-y divide-gray-50">
                {apps.map(app => (
                  <div key={app.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-400">
                        {app.company?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{app.offerTitle}</p>
                        <p className="text-xs text-gray-400 font-medium uppercase">{app.company} • {app.date}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      app.status === 'Entretien' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'apps' && (
           <div className="bg-white p-8 rounded-[2rem] border border-gray-100 text-center space-y-4">
              <div className="text-5xl">📁</div>
              <h3 className="text-xl font-black text-gray-900">Suivi détaillé des candidatures</h3>
              <p className="text-gray-500 max-w-sm mx-auto">Visualisez l'historique complet de vos interactions avec les recruteurs.</p>
              <Link to="/offres" className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all">
                Retour aux offres
              </Link>
           </div>
        )}
      </main>
    </div>
  );
};

// --- Vue Recruteur ---

const EmployerView = ({ user }: { user: any }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await apiService.getEmployerJobs();
      setJobs(data);
    };
    load();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Recruteur */}
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
              <StatCard title="Candidats Totaux" value="57" icon="👨‍🎓" trend="+8 aujourd'hui" />
              <StatCard title="Entretiens Prévus" value="14" icon="📅" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                  <h3 className="font-black text-gray-900 mb-6">Offres les plus populaires</h3>
                  <div className="space-y-6">
                     {jobs.map(job => (
                       <div key={job.id} className="flex items-center justify-between">
                          <div>
                             <p className="font-bold text-gray-900">{job.title}</p>
                             <p className="text-xs text-gray-400 font-medium">{job.views} vues • {job.candidatesCount} candidats</p>
                          </div>
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-600" style={{ width: `${(job.candidatesCount / 50) * 100}%` }}></div>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
               
               <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-black mb-2">Besoin de plus de visibilité ?</h3>
                    <p className="text-blue-100 text-sm opacity-80">Boostez vos annonces pour apparaître en tête de liste pendant 7 jours.</p>
                  </div>
                  <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs mt-6 self-start hover:bg-blue-50 transition-all">
                    Passer en Premium ⭐
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
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4">Titre de l'offre</th>
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
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Réf: {job.id.toUpperCase()}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="font-black text-gray-900">{job.candidatesCount}</span>
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
           </div>
        )}
      </main>
    </div>
  );
};

// --- Dashboard Main Entry ---

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/connexion" />;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Top Banner Contextual */}
      <div className="bg-white border-b border-gray-100 py-12 px-4 mb-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
              Ravi de vous revoir, <span className="text-blue-600">{user?.name}</span> !
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              {user?.role === 'student' 
                ? "Propulsez votre carrière avec nos dernières opportunités." 
                : "Gérez vos recrutements et trouvez les meilleurs talents du Maroc."}
            </p>
          </div>
          <div className="flex items-center space-x-4 bg-gray-50 p-2 rounded-2xl border border-gray-100 shadow-inner">
             <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl font-black text-blue-600">
               {user?.name.charAt(0).toUpperCase()}
             </div>
             <div className="pr-4">
                <p className="text-xs font-black text-gray-900 uppercase tracking-widest">{user?.role === 'student' ? 'Compte Étudiant' : 'Compte Entreprise'}</p>
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