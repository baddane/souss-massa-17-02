import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobOffersService, formatJobOffer } from '../services/jobOffersService';
import { useAuth } from '../contexts/AuthContext';

interface JobOfferDetailProps {
  offerId: string;
}

const JobOfferDetail: React.FC<JobOfferDetailProps> = ({ offerId }) => {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const loadOffer = async () => {
      try {
        setLoading(true);
        const offerData = await jobOffersService.getJobOfferById(offerId);
        if (offerData) {
          setOffer(offerData);
        } else {
          navigate('/offers', { replace: true });
        }
      } catch (error) {
        console.error('Error loading job offer:', error);
        navigate('/offers', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    if (offerId) {
      loadOffer();
    }
  }, [offerId, navigate]);

  const handleApply = async () => {
    if (!isAuthenticated) {
      alert("Connectez-vous pour postuler.");
      return;
    }
    
    setApplying(true);
    try {
      // Pour l'instant, on affiche simplement un message de confirmation
      alert(`Candidature envoyée pour l'offre: ${offer.emploi_metier}`);
    } catch (e) {
      console.error("Application failed", e);
      alert("Erreur lors de la candidature. Réessayez.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Offre non trouvée</h2>
          <p className="text-gray-500">L'offre d'emploi que vous recherchez n'existe pas ou a été supprimée.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* En-tête de l'offre */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold">
              {offer.raison_sociale.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{offer.emploi_metier}</h1>
              <p className="text-gray-600 font-medium text-lg">{offer.raison_sociale}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                  {formatJobOffer.formatContractType(offer.type_contrat)}
                </span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                  {offer.ville}
                </span>
                <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm">
                  {formatJobOffer.formatNumberOfPositions(offer.nbre_postes)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="md:ml-auto flex flex-col gap-3">
            <button 
              onClick={handleApply}
              disabled={applying}
              className={`px-8 py-3 rounded-lg font-bold transition-all ${
                applying
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {applying ? "Envoi en cours..." : "Postuler maintenant"}
            </button>
            <div className="text-xs text-gray-400 text-center">
              Référence: {offer.ref_offre} • Publiée le: {formatJobOffer.formatDate(offer.date_offre)}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Description du poste */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Description du poste</h2>
            <div className="space-y-6">
              {/* Convertir le markdown en HTML */}
              <div 
                className="text-gray-700 leading-relaxed text-lg space-y-4"
                dangerouslySetInnerHTML={{ 
                  __html: offer.full_description
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/^#\s+(.*)$/gm, '<h1 class="text-3xl font-bold text-gray-900 mt-8 mb-4 border-b border-gray-300 pb-2">$1</h1>')
                    .replace(/^##\s+(.*)$/gm, '<h2 class="text-2xl font-bold text-gray-900 mt-6 mb-3 border-b border-gray-200 pb-2">$1</h2>')
                    .replace(/^###\s+(.*)$/gm, '<h3 class="text-xl font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
                    .replace(/^####\s+(.*)$/gm, '<h4 class="text-lg font-medium text-gray-900 mt-4 mb-2">$1</h4>')
                    .replace(/^#####\s+(.*)$/gm, '<h5 class="text-base font-medium text-gray-900 mt-3 mb-2">$1</h5>')
                    .replace(/^######\s+(.*)$/gm, '<h6 class="text-sm font-medium text-gray-900 mt-3 mb-2">$1</h6>')
                    .replace(/\n\n/g, '</p><p class="mt-4">')
                    .replace(/\n/g, '<br>')
                    .replace(/^- (.*?)$/gm, '• $1')
                    .replace(/^\* (.*?)$/gm, '• $1')
                    .replace(/^1\. (.*?)$/gm, '1. $1')
                    .replace(/^2\. (.*?)$/gm, '2. $1')
                    .replace(/^3\. (.*?)$/gm, '3. $1')
                    .replace(/^4\. (.*?)$/gm, '4. $1')
                    .replace(/^5\. (.*?)$/gm, '5. $1')
                }}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Informations principales</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="font-semibold text-gray-700">Type de contrat:</span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium text-sm">
                        {formatJobOffer.formatContractType(offer.type_contrat)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="font-semibold text-gray-700">Lieu:</span>
                      <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium text-sm">
                        {offer.ville}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="font-semibold text-gray-700">Nombre de postes:</span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium text-sm">
                        {formatJobOffer.formatNumberOfPositions(offer.nbre_postes)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-semibold text-gray-700">Référence:</span>
                      <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-mono font-medium text-sm">
                        {offer.ref_offre}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Détails de l'offre</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="font-semibold text-gray-700">Entreprise:</span>
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium text-sm">
                        {offer.raison_sociale}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="font-semibold text-gray-700">Date de publication:</span>
                      <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium text-sm">
                        {formatJobOffer.formatDate(offer.date_offre)}
                      </span>
                    </div>
                    {offer.suggested_salary_range && (
                      <div className="flex justify-between items-center py-2">
                        <span className="font-semibold text-gray-700">Salaire proposé:</span>
                        <span className="bg-green-200 text-green-900 px-4 py-2 rounded-lg font-bold text-lg">
                          {offer.suggested_salary_range}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informations complémentaires */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Informations complémentaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Type de contrat: </span>
                <span className="text-sm text-gray-600">{formatJobOffer.formatContractType(offer.type_contrat)}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Lieu: </span>
                <span className="text-sm text-gray-600">{offer.ville}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Nombre de postes: </span>
                <span className="text-sm text-gray-600">{formatJobOffer.formatNumberOfPositions(offer.nbre_postes)}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Référence: </span>
                <span className="text-sm text-gray-600 font-mono">{offer.ref_offre}</span>
              </div>
            </div>
          </div>

          {/* Compétences requises */}
          {offer.required_skills && offer.required_skills.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Compétences requises</h2>
              <div className="flex flex-wrap gap-2">
                {offer.required_skills.map((skill: string, index: number) => (
                  <span key={index} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Salaire suggéré */}
          {offer.suggested_salary_range && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Salaire suggéré</h2>
              <p className="text-gray-600 text-lg">{offer.suggested_salary_range}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* Informations sur l'entreprise */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">À propos de l'entreprise</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Entreprise: </span>
                <span className="text-sm text-gray-600 font-medium">{offer.raison_sociale}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Secteur: </span>
                <span className="text-sm text-gray-600">Non spécifié</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Taille: </span>
                <span className="text-sm text-gray-600">Non spécifié</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={handleApply}
                disabled={applying}
                className={`w-full px-4 py-3 rounded-lg font-bold transition-all ${
                  applying
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {applying ? "Envoi en cours..." : "Postuler maintenant"}
              </button>
              <button 
                onClick={() => navigate('/offers')}
                className="w-full px-4 py-3 rounded-lg font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Retour aux offres
              </button>
            </div>
          </div>

          {/* Métadonnées SEO */}
          {offer.seo_keywords && offer.seo_keywords.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Mots-clés</h2>
              <div className="flex flex-wrap gap-2">
                {offer.seo_keywords.map((keyword: string, index: number) => (
                  <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobOfferDetail;