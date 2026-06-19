
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Offers from './pages/Offers';
import JobDetail from './pages/JobDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import Companies from './pages/Companies';
import Schools from './pages/Schools';
import Advice from './pages/Advice';
import Blog from './pages/Blog';
import CareerAssistant from './components/CareerAssistant';
import { AuthProvider, useAuth } from './contexts/AuthContext';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App Error Boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Une erreur est survenue</h1>
            <p className="text-gray-500 text-sm">
              {this.state.error?.message || "L'application a rencontre un probleme inattendu."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              Retour a l'accueil
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/connexion" />;
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/offres" element={<Offers />} />
      <Route path="/emploi/:id/:slug?" element={<JobDetail />} />
      <Route path="/connexion" element={<Login />} />
      <Route path="/inscription" element={<Register />} />
      <Route path="/nos-tarifs" element={<Pricing />} />
      <Route path="/entreprises" element={<Companies />} />
      <Route path="/ecoles" element={<Schools />} />
      <Route path="/conseils" element={<Advice />} />
      <Route path="/blog" element={<Blog />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/profil" element={
        <ProtectedRoute>
          <ProfileSetup />
        </ProtectedRoute>
      } />

      <Route path="/finaliser-profil" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-gray-50">
              <Header />
              <main id="main-content" className="flex-grow">
                <AppRoutes />
              </main>
              <Footer />
              <CareerAssistant />
            </div>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnHover
            />
          </Router>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
