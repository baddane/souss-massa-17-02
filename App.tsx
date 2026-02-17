
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Offers from './pages/Offers';
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

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/connexion" />;
  // On ne redirige plus vers finaliser-profil s'il est déjà complet (ce qui est le cas après Register)
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/offres" element={<Offers />} />
      <Route path="/connexion" element={<Login />} />
      <Route path="/inscription" element={<Register />} />
      <Route path="/nos-tarifs" element={<Pricing />} />
      <Route path="/entreprises" element={<Companies />} />
      <Route path="/ecoles" element={<Schools />} />
      <Route path="/conseils" element={<Advice />} />
      <Route path="/blog" element={<Blog />} />
      
      {/* Routes protégées */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      {/* Profil détaillé et édition */}
      <Route path="/profil" element={
        <ProtectedRoute>
          <ProfileSetup />
        </ProtectedRoute>
      } />
      
      
      {/* Legacy / redirection fallback */}
      <Route path="/finaliser-profil" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Header />
          <main className="flex-grow">
            <AppRoutes />
          </main>
          <Footer />
          <CareerAssistant />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
