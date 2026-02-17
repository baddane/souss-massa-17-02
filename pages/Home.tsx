
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jobOffersService } from '../services/jobOffersService';
import { CITIES, SECTORS } from '../constants';

const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [featuredOffers, setFeaturedOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/offres?q=${searchQuery}&city=${selectedCity}&sector=${selectedSector}`);
  };

  // Charger les offres en vedette
  useEffect(() => {
    const loadFeaturedOffers = async () => {
      try {
        setLoading(true);
        const offers = await jobOffersService.getAllJobOffers();
        // Trier par date de publication et prendre les 6 plus récentes
        const sortedOffers = offers
          .sort((a: any, b: any) => new Date(b.date_offre).getTime() - new Date(a.date_offre).getTime())
          .slice(0, 6);
        setFeaturedOffers(sortedOffers);
      } catch (error) {
        console.error('Error loading featured offers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadFeaturedOffers();
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative bg-blue-700 py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>
        
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Boostez votre carrière dans la région Souss-Massa
          </h1>
          <p className="text-xl text-blue-50 font-medium">
            Le portail emploi n°1 à Agadir et ses environs sur soussmassa-rh.com
          </p>

          <form onSubmit={handleSearch} className="bg-white p-2 rounded-xl shadow-xl flex flex-col md:flex-row gap-2 max-w-5xl mx-auto">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Quel métier cherchez-vous ?"
                className="w-full pl-10 pr-4 py-3 border-none focus:ring-0 text-gray-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="md:w-48 border-t md:border-t-0 md:border-l border-gray-100">
              <select 
                className="w-full px-4 py-3 border-none focus:ring-0 text-gray-600 bg-transparent cursor-pointer"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="">Toute ville</option>
                {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>

            <div className="md:w-48 border-t md:border-t-0 md:border-l border-gray-100">
              <select 
                className="w-full px-4 py-3 border-none focus:ring-0 text-gray-600 bg-transparent cursor-pointer"
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
              >
                <option value="">Tout secteur</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <button type="submit" className="bg-orange-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-lg">
              Rechercher
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-6 text-white/90 text-sm">
            <div className="flex items-center"><span className="font-bold text-white mr-1">+5 000</span> offres régionales</div>
            <div className="flex items-center"><span className="font-bold text-white mr-1">+300</span> entreprises locales</div>
            <div className="flex items-center"><span className="font-bold text-white mr-1">+50 000</span> inscrits</div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {loading ? (
          // Skeleton loading for stats
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2 w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))
        ) : (
          [
            { title: "Offres à Agadir", count: featuredOffers.filter(offer => offer.ville === 'Agadir').length.toString(), color: "bg-blue-100 text-blue-700", icon: "🏙️" },
            { title: "Stages Souss-Massa", count: featuredOffers.filter(offer => offer.type_contrat === 'Stage').length.toString(), color: "bg-green-100 text-green-700", icon: "🎓" },
            { title: "CDI / Emplois", count: featuredOffers.filter(offer => offer.type_contrat === 'CDI').length.toString(), color: "bg-purple-100 text-purple-700", icon: "💼" },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
              <div>
                <h3 className="text-gray-500 font-medium">{stat.title}</h3>
                <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Featured Offers */}
      <section className="max-w-7xl mx-auto px-4 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Opportunités à la Une</h2>
            <p className="text-gray-500">Postulez aux meilleures offres du Souss-Massa</p>
          </div>
          <Link to="/offres" className="text-blue-700 font-medium hover:underline">Voir tout →</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Skeleton loading
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))
          ) : featuredOffers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">Aucune offre en vedette pour le moment.</p>
            </div>
          ) : (
            featuredOffers.map((offer) => (
              <div key={offer.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                    {offer.raison_sociale.charAt(0)}
                  </div>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {offer.type_contrat}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors mb-2 line-clamp-1">
                  {offer.emploi_metier}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{offer.raison_sociale} • {offer.ville}</p>
                <div className="flex items-center text-gray-400 text-xs mt-4 pt-4 border-t border-gray-50">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Publiée le {new Date(offer.date_offre).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Top Companies */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 space-y-12 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Ils recrutent sur SoussMassa-RH</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Découvrez les leaders de la région</p>
          </div>
          <div className="flex flex-wrap justify-center gap-12 grayscale opacity-60 hover:grayscale-0 transition-all duration-500">
            {/* Placeholder logos for top companies - will be replaced with real company logos from Supabase */}
            {['logo1.png', 'logo2.png', 'logo3.png', 'logo4.png', 'logo5.png', 'logo6.png'].map((logo, index) => (
              <div key={index} className="h-16 w-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                Logo entreprise
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 md:p-12 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold">Vous recrutez dans le Souss-Massa ?</h2>
            <p className="text-blue-100 text-lg">Publiez vos annonces sur soussmassa-rh.com et accédez au meilleur vivier de talents locaux.</p>
            <div className="pt-6 flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/inscription" className="bg-white text-blue-700 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors">
                Recruter maintenant
              </Link>
              <Link to="/nos-tarifs" className="bg-blue-600/30 border border-white/30 text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors">
                Nos tarifs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;