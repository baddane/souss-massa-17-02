import React, { useState, useEffect } from 'react';

import { dataService } from '../src/services/dataService';
import { School } from '../src/services/dataService';

const Schools: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Get unique cities and school types for filters
  const cities = Array.from(new Set(schools.map(s => s.ville).filter(Boolean))).sort();
  const schoolTypes = Array.from(new Set(schools.map(s => s.type_ecole).filter(Boolean))).sort();

  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoading(true);
        const schoolsData = await dataService.getSchools();
        setSchools(schoolsData);
      } catch (error) {
        console.error('Error loading schools:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSchools();
  }, []);

  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         school.presentation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         school.filieres?.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCity = !selectedCity || school.ville === selectedCity;
    const matchesType = !selectedType || school.type_ecole === selectedType;

    return matchesSearch && matchesCity && matchesType;
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Écoles et Formations</h1>
        <p className="text-gray-600">Découvrez les établissements de formation dans la région Souss-Massa</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
            <input
              type="text"
              placeholder="Nom de l'école, filière ou description..."
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Type d'établissement</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">Tous les types</option>
              {schoolTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSchools.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500 text-lg">Aucun établissement trouvé</div>
            <p className="text-gray-400 mt-2">Essayez d'ajuster vos critères de recherche</p>
          </div>
        ) : (
          filteredSchools.map((school) => (
            <div key={school.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-32 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <span className="text-white text-4xl font-bold">{school.nom.charAt(0)}</span>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{school.nom}</h3>
                  {school.type_ecole && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                      {school.type_ecole}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{school.presentation}</p>

                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  {school.ville && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{school.ville}</span>
                    </div>
                  )}

                  {school.site_web && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                      </svg>
                      <span className="truncate max-w-xs">{school.site_web}</span>
                    </div>
                  )}
                </div>

                {/* Filieres */}
                {school.filieres && school.filieres.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Filières proposées</h4>
                    <div className="flex flex-wrap gap-2">
                      {school.filieres.slice(0, 4).map((filiere, index) => (
                        <span key={index} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                          {filiere}
                        </span>
                      ))}
                      {school.filieres.length > 4 && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                          +{school.filieres.length - 4} autres
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  {school.site_web && (
                    <a
                      href={school.site_web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
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
            <div className="text-3xl font-bold text-green-600">{schools.length}</div>
            <div className="text-gray-600">Établissements</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{cities.length}</div>
            <div className="text-gray-600">Villes couvertes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{schoolTypes.length}</div>
            <div className="text-gray-600">Types d'établissements</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schools;
