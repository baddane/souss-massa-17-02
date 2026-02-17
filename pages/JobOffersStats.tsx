import React, { useState, useEffect } from 'react';
import { jobOffersService } from '../src/services/jobOffersService';

const JobOffersStats: React.FC = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        const offersData = await jobOffersService.getAllJobOffers();
        setOffers(offersData);
      } catch (error) {
        console.error('Error loading job offers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucune offre disponible</h2>
          <p className="text-gray-500">Aucune offre d'emploi n'est actuellement disponible dans la base de données.</p>
        </div>
      </div>
    );
  }

  // Calculer les statistiques à partir des offres
  const totalOffers = offers.length;
  const contractStats: Record<string, number> = offers.reduce((acc, offer) => {
    const type = offer.type_contrat || 'Inconnu';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const cityStats: Record<string, number> = offers.reduce((acc, offer) => {
    const city = offer.ville || 'Inconnue';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});

  const jobTitleStats: Record<string, number> = offers.reduce((acc, offer) => {
    const title = offer.emploi_metier || 'Inconnu';
    acc[title] = (acc[title] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Statistiques des Offres d'Emploi</h1>
        <p className="text-gray-600 mt-2">Analyse des {totalOffers} offres d'emploi disponibles dans notre base de données</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Offres</p>
              <p className="text-3xl font-bold text-gray-900">{totalOffers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">💼</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Types de Contrats</p>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(contractStats).length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Villes</p>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(cityStats).length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">🏙️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Métiers</p>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(jobTitleStats).length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-xl">👨‍💼</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Types de Contrats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Répartition par Type de Contrat</h2>
          <div className="space-y-4">
            {Object.entries(contractStats).map(([type, count], index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{type}</p>
                  <p className="text-sm text-gray-600">{count} offre(s)</p>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(count / totalOffers) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Villes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Répartition par Ville</h2>
          <div className="space-y-4">
            {Object.entries(cityStats).map(([city, count], index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{city}</p>
                  <p className="text-sm text-gray-600">{count} offre(s)</p>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${(count / totalOffers) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Métiers les plus recherchés */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Métiers les plus recherchés</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(jobTitleStats)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 9)
              .map(([title, count], index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-gray-200">
                  <p className="font-bold text-gray-900 mb-1">{title}</p>
                  <p className="text-sm text-gray-600">{count} offre(s)</p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Dernières offres */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Dernières Offres Ajoutées</h2>
        <div className="space-y-4">
          {offers.slice(0, 6).map((offer, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{offer.emploi_metier}</p>
                <p className="text-sm text-gray-600">{offer.raison_sociale} • {offer.ville}</p>
              </div>
              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                {offer.type_contrat}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobOffersStats;