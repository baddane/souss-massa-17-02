
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Offers from './pages/Offers';
import JobDetail from './pages/JobDetail';
import Admin from './pages/Admin';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import { AuthProvider } from './contexts/AuthContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main id="main-content" className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/offres" element={<Offers />} />
                <Route path="/emploi/:slug" element={<JobDetail />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <ToastContainer
            position="top-center"
            autoClose={3000}
            hideProgressBar
            newestOnTop
            closeOnClick
            pauseOnHover
          />
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
};

export default App;
