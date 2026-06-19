
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CITIES } from '../constants';
import { studentService, companyService } from '../services/supabaseService';
import { supabase } from '../src/services/supabase';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';

const Register: React.FC = () => {
  const [step, setStep] = useState<'choose' | 'form'>('choose');
  const [role, setRole] = useState<'student' | 'company'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    city: '',
  });

  const handleGoogleSignup = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      toast.error(error?.message || 'Erreur de connexion Google.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      toast.warning('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const userId = await signUp(formData.email, formData.password, role, { firstName: formData.name });

      if (userId) {
        try {
          await supabase.from('users').upsert({
            id: userId,
            email: formData.email,
            name: formData.name || formData.email.split('@')[0],
            role: role,
            profile_status: 'incomplete',
          }, { onConflict: 'id', ignoreDuplicates: true });
        } catch (e) {
          console.error('users row failed:', e);
        }

        try {
          if (role === 'student') {
            await studentService.createProfile({
              user_id: userId,
              first_name: formData.name,
              last_name: '',
              city: formData.city,
              skills: [],
              experience_years: 0,
            });
          } else {
            await companyService.createProfile({
              user_id: userId,
              company_name: formData.name,
              city: formData.city,
            });
          }
        } catch (e) {
          console.error('profile creation failed:', e);
        }
      }

      navigate('/dashboard');
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('rate limit') || msg.includes('email rate')) {
        toast.error('Trop de tentatives. Patientez quelques minutes.');
      } else if (msg.includes('already registered') || msg.includes('already exists')) {
        toast.error('Email deja utilise. Connectez-vous.');
      } else {
        toast.error(msg || "Erreur lors de l'inscription.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Inscription gratuite"
        description="Inscrivez-vous gratuitement sur SoussMassa-RH. Acces immediat aux offres d'emploi a Agadir et dans tout le Souss-Massa."
        canonical="/inscription"
      />

      <main className="min-h-[80vh] flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              {step === 'choose' ? 'Rejoignez SoussMassa-RH' : role === 'student' ? 'Inscription Candidat' : 'Inscription Entreprise'}
            </h1>
            <p className="text-gray-500 mt-2">Gratuit. Sans engagement. En 30 secondes.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 space-y-6">
            <button
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 py-4 px-6 rounded-xl font-bold text-gray-700 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              S'inscrire avec Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="bg-white px-4 text-gray-400">ou par email</span></div>
            </div>

            {step === 'choose' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center font-medium">Je suis :</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setRole('student'); setStep('form'); }}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
                  >
                    <div className="text-3xl mb-2">🎓</div>
                    <p className="font-bold text-gray-900 group-hover:text-blue-700">Candidat</p>
                    <p className="text-xs text-gray-400 mt-1">Je cherche un emploi</p>
                  </button>
                  <button
                    onClick={() => { setRole('company'); setStep('form'); }}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
                  >
                    <div className="text-3xl mb-2">🏢</div>
                    <p className="font-bold text-gray-900 group-hover:text-blue-700">Entreprise</p>
                    <p className="text-xs text-gray-400 mt-1">Je recrute</p>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder={role === 'student' ? 'Votre nom complet' : "Nom de l'entreprise"}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <input
                  type="password"
                  required
                  placeholder="Mot de passe (8 caracteres min.)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-gray-600"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                >
                  <option value="">Ville (optionnel)</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {isLoading ? 'Creation...' : "Creer mon compte gratuit"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="w-full text-sm text-gray-400 hover:text-gray-600"
                >
                  Retour
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-gray-500">
            Deja inscrit ?{' '}
            <Link to="/connexion" className="text-blue-600 font-bold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </main>
    </>
  );
};

export default Register;
