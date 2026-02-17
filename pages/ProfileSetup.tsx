
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CITIES } from '../constants';

const ProfileSetup: React.FC = () => {
  const { user, completeProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Initialisation avec les données utilisateur s'il y en a déjà (via l'IA lors de l'inscription)
  const [formData, setFormData] = useState({
    firstName: user?.details?.firstName || user?.name.split(' ')[0] || '',
    lastName: user?.details?.lastName || user?.name.split(' ')[1] || '',
    city: user?.details?.city || '',
    phone: user?.details?.phone || '',
    email: user?.email || '',
    educationLevel: user?.details?.educationLevel || 'Bac+5 (Master/Ingénieur)',
    experienceYears: user?.details?.experienceYears || 0,
    skills: user?.details?.skills || '',
    companySize: user?.details?.companySize || '51-200 employés',
    description: user?.details?.description || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await completeProfile(formData);
    navigate('/dashboard');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-blue-600 p-10 text-white text-center relative overflow-hidden">
            <h1 className="text-3xl font-black tracking-tight">Vérification du profil</h1>
            <p className="opacity-90 mt-2 font-medium">
              Veuillez confirmer ou compléter les informations extraites.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Prénom</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nom</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Téléphone</label>
                <input
                  type="tel"
                  required
                  placeholder="06XXXXXXXX"
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Ville</label>
                <select
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none bg-white font-medium"
                >
                  <option value="">Choisir</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {user.role === 'student' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Années d'Expérience</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({...formData, experienceYears: parseInt(e.target.value) || 0})}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Bio Professionnelle</label>
              <textarea
                rows={4}
                className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none resize-none font-medium"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3"
            >
              {isLoading ? (
                 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Enregistrer et accéder au Dashboard</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
