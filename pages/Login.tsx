
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password, 'student');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.message || 'Identifiants incorrects. Vérifiez votre email et mot de passe.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main id="main-content" className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 border border-gray-100">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Connexion</h1>
          <p className="text-gray-500 mt-2 text-sm">Accédez à votre espace SoussMassa-RH</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="exemple@email.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700">
                Mot de passe
              </label>
              <Link
                to="/mot-de-passe-oublie"
                className="text-xs text-blue-600 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="text-blue-600 font-bold hover:underline">
            S'inscrire gratuitement
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Login;
