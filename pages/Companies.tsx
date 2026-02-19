import React, { useState, useEffect } from 'react';

import { dataService } from '../src/services/dataService';
import { Company } from '../src/services/dataService';

const stripMarkdown = (text: string): string =>
  text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');

  // Get unique cities and sectors for filters
  const cities = Array.from(new Set(companies.map(c => c.ville).filter(Boolean))).sort();
  const industries = Array.from(new Set(companies.map(c => c.secteur).filter(Boolean))).sort();

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoading(true);
        const companiesData = await dataService.getCompanies();
        setCompanies(companiesData);
      } catch (error: any) {
        console.error('Error loading companies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, []);

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         company.presentation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = !selectedCity || company.ville === selectedCity;
    const matchesIndustry = !selectedIndustry || company.secteur === selectedIndustry;

    return matchesSearch && matchesCity && matchesIndustry;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Entreprises Locales</h1>
        <p className="text-gray-600">Découvrez les entreprises qui recrutent dans la région Souss-Massa</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              placeholder="Nom de l'entreprise ou description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">Toutes les villes</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Secteur</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
            >
              <option value="">Tous les secteurs</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500 text-lg">Aucune entreprise trouvée</div>
            <p className="text-gray-400 mt-2">Essayez d'ajuster vos critères de recherche</p>
          </div>
        ) : (
          filteredCompanies.map((company) => (
            <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-32 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-white text-4xl font-bold">{company.nom.charAt(0)}</span>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{company.nom}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{company.presentation ? stripMarkdown(company.presentation) : ''}</p>

                <div className="space-y-2 text-sm text-gray-500">
                  {company.ville && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{company.ville}</span>
                    </div>
                  )}

                  {company.secteur && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{company.secteur}</span>
                    </div>
                  )}

                  {company.nb_employes && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <span>{company.nb_employes} employés</span>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  {company.site_web && (
                    <a
                      href={company.site_web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Visiter le site
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Statistiques</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{companies.length}</div>
            <div className="text-gray-600">Entreprises totales</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{cities.length}</div>
            <div className="text-gray-600">Villes couvertes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{industries.length}</div>
            <div className="text-gray-600">Secteurs d'activité</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Companies;
