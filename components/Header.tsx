
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const navLinks = [
    { name: 'Accueil', path: '/' },
    { name: 'Offres', path: '/offres' },
    { name: 'Entreprises', path: '/entreprises' },
    { name: 'Écoles', path: '/ecoles' },
    { name: 'Conseils', path: '/conseils' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-1">
            <span className="text-2xl font-bold text-blue-700">SoussMassa</span>
            <span className="text-2xl font-light text-gray-500">-RH</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-blue-700 ${
                  isActive(link.path) ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-600'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Action Buttons / Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <Link to="/connexion" className="text-gray-600 hover:text-blue-700 text-sm font-medium">
                  Connexion
                </Link>
                <Link to="/inscription" className="bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors">
                  Inscription
                </Link>
              </>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 bg-gray-50 p-1 pr-3 rounded-full hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{user?.name}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-bottom border-gray-50 mb-1">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        {user?.role === 'student' ? 'Espace Talent' : 'Espace Recruteur'}
                      </p>
                    </div>
                    <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Tableau de bord</Link>
                    <Link to="/profil" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Mon profil</Link>
                    <hr className="my-1 border-gray-50" />
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-blue-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 py-4 px-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive(link.path) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-gray-100 flex flex-col space-y-2">
            {!isAuthenticated ? (
              <>
                <Link 
                  to="/connexion" 
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full text-center py-2 text-gray-600 font-medium"
                >
                  Connexion
                </Link>
                <Link 
                  to="/inscription" 
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full bg-blue-700 text-white py-2 rounded-md font-medium text-center"
                >
                  Inscription
                </Link>
              </>
            ) : (
              <>
                <div className="px-3 py-2 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full bg-red-50 text-red-600 py-2 rounded-md font-medium"
                >
                  Déconnexion
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;