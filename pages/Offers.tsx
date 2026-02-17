
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jobOffersService, formatJobOffer } from '../services/jobOffersService';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

const Offers: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredOffers, setFilteredOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();
  
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [jobTitle, setJobTitle] = useState(searchParams.get('jobTitle') || '');
  const [contractType, setContractType] = useState<string>('');
  
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());

  // Charger les offres depuis Supabase
  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        const offers = await jobOffersService.getAllJobOffers();
        setFilteredOffers(offers);
      } catch (error) {
        console.error('Error loading job offers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOffers();
  }, []);

  // Filtrer les offres
  useEffect(() => {
    const filterOffers = async () => {
      try {
        setLoading(true);
        const filters = {
          city: city || undefined,
          contractType: contractType || undefined,
          jobTitle: jobTitle || undefined,
          keywords: search || undefined
        };
        
        const offers = await jobOffersService.searchJobOffers(filters);
        setFilteredOffers(offers);
      } catch (error) {
        console.error('Error filtering job offers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (search || city || jobTitle || contractType) {
      filterOffers();
    }
  }, [search, city, jobTitle, contractType]);

  const handleApply = async (offer: any) => {
    if (!isAuthenticated) {
      alert("Connectez-vous pour postuler.");
      return;
    }
    
    setApplyingId(offer.id);
    try {
      // Pour l'instant, on affiche simplement un message de confirmation
      // La logique de candidature sera implémentée plus tard avec Supabase
      alert(`Candidature envoyée pour l'offre: ${offer.emploi_metier}`);
      setAppliedIds([...appliedIds, offer.id]);
    } catch (e) {
      console.error("Application failed", e);
      alert("Erreur lors de la candidature. Réessayez.");
    } finally {
      setApplyingId(null);
    }
  };

  // Générer les meta tags SEO
  const generateSEOMetaTags = () => {
    const title = filteredOffers.length > 0 
      ? `${filteredOffers.length} Offres d'emploi à ${city || 'Agadir, Marrakech, Essaouira'} - Souss Massa RH`
      : `Offres d'emploi à ${city || 'Agadir, Marrakech, Essaouira'} - Souss Massa RH`;
    
    const description = filteredOffers.length > 0
      ? `Découvrez ${filteredOffers.length} offres d'emploi à ${city || 'Agadir, Marrakech, Essaouira'}. CDI, CDD, Stage, Alternance. Trouvez votre emploi idéal dans le Souss-Massa.`
      : `Recherchez des offres d'emploi à ${city || 'Agadir, Marrakech, Essaouira'}. CDI, CDD, Stage, Alternance. Trouvez votre emploi idéal dans le Souss-Massa.`;
    
    const keywords = [
      `offres d'emploi ${city || 'Agadir'}`,
      `emploi ${city || 'Agadir'}`,
      `CDI ${city || 'Agadir'}`,
      `CDD ${city || 'Agadir'}`,
      `stage ${city || 'Agadir'}`,
      `alternance ${city || 'Agadir'}`,
      'souss massa rh',
      'recrutement souss massa',
      'emploi maroc',
      'offres d emploi maroc'
    ].join(', ');

    return { title, description, keywords };
  };

  const seoMeta = generateSEOMetaTags();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <h2 className="font-bold text-gray-900 text-lg">🔎 Filtrer les offres</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher un poste</label>
                  <input 
                    type="text" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ex: développeur, caissier, infirmier..." 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
                  <select 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Toutes les villes</option>
                    <option value="Agadir">Agadir - Emploi Agadir</option>
                    <option value="Marrakech">Marrakech - Emploi Marrakech</option>
                    <option value="Essaouira">Essaouira - Emploi Essaouira</option>
                    <option value="Taroudant">Taroudant - Emploi Taroudant</option>
                    <option value="Inezgane">Inezgane - Emploi Inezgane</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Type de contrat</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="radio" name="contract" checked={contractType === ''} onChange={() => setContractType('')} />
                      <span className="text-sm font-medium">Tous types de contrats</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="radio" name="contract" checked={contractType === 'CDI'} onChange={() => setContractType('CDI')} />
                      <span className="text-sm">CDI - Contrat à durée indéterminée</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="radio" name="contract" checked={contractType === 'CDD'} onChange={() => setContractType('CDD')} />
                      <span className="text-sm">CDD - Contrat à durée déterminée</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="radio" name="contract" checked={contractType === 'Stage'} onChange={() => setContractType('Stage')} />
                      <span className="text-sm">Stage - Formation professionnelle</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="radio" name="contract" checked={contractType === 'Alternance'} onChange={() => setContractType('Alternance')} />
                      <span className="text-sm">Alternance - Études et travail</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* SEO Content */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 mb-3">💡 Conseils recherche d'emploi</h3>
              <div className="text-blue-800 text-sm space-y-2">
                <p><strong>Recherchez par ville :</strong> Agadir, Marrakech, Essaouira, Taroudant, Inezgane</p>
                <p><strong>Types d'emploi :</strong> CDI, CDD, Stage, Alternance</p>
                <p><strong>Mots-clés utiles :</strong> caissier, développeur, infirmier, technicien</p>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{seoMeta.title}</h1>
                <p className="text-gray-600 mt-2">{seoMeta.description}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                  {filteredOffers.length} offres disponibles
                </span>
                <span>📍 Souss-Massa, Maroc</span>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredOffers.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-gray-500 text-lg">Aucune offre d'emploi trouvée</h3>
              <p className="text-gray-400 mt-2">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOffers.map(offer => (
                <div key={offer.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-400 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                        {offer.raison_sociale.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900">{offer.emploi_metier}</h3>
                        <p className="text-gray-600 font-medium">{offer.raison_sociale}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-sm font-medium">
                            {formatJobOffer.formatContractType(offer.type_contrat)}
                          </span>
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                            {offer.ville}
                          </span>
                          <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-sm">
                            {formatJobOffer.formatNumberOfPositions(offer.nbre_postes)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        disabled={applyingId === offer.id || appliedIds.includes(offer.id)}
                        onClick={() => handleApply(offer)}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${
                          appliedIds.includes(offer.id) 
                            ? 'bg-green-100 text-green-600 cursor-default' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {applyingId === offer.id ? "Envoi..." : appliedIds.includes(offer.id) ? "Postulé ✓" : "Postuler"}
                      </button>
                      <span className="text-xs text-gray-400 text-center">
                        Réf: {offer.ref_offre}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        const newSet = new Set(expandedOffers);
                        if (newSet.has(offer.id)) {
                          newSet.delete(offer.id);
                        } else {
                          newSet.add(offer.id);
                        }
                        setExpandedOffers(newSet);
                      }}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">Description du poste</span>
                        <span className="text-xs text-gray-500">({offer.full_description ? offer.full_description.split('\n').length : 0} lignes)</span>
                      </span>
                      {expandedOffers.has(offer.id) ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div className={`mt-3 transition-all duration-300 ease-in-out ${
                      expandedOffers.has(offer.id) 
                        ? 'max-h-[600px] opacity-100 overflow-y-auto' 
                        : 'max-h-0 opacity-0 overflow-hidden'
                    }`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div 
                            className="text-gray-600 leading-relaxed text-sm space-y-3"
                            dangerouslySetInnerHTML={{ 
                              __html: (offer.full_description || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                .replace(/^###\s+(.*)$/gm, '<h5 class="font-bold text-gray-800 mt-4 mb-2 border-b border-gray-200 pb-2">$1</h5>')
                                .replace(/^##\s+(.*)$/gm, '<h6 class="font-semibold text-gray-800 mt-3 mb-2">$1</h6>')
                                .replace(/^#\s+(.*)$/gm, '<h4 class="font-bold text-gray-900 mt-6 mb-3 text-lg">$1</h4>')
                                .replace(/\n\n/g, '</p><p class="mt-3">')
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
                        </div>
                        
                        <div className="space-y-4">
                          {offer.required_skills && offer.required_skills.length > 0 && (
                            <div>
                              <span className="text-sm font-semibold text-gray-800 mb-2 block">Compétences requises</span>
                              <div className="flex flex-wrap gap-2">
                                {offer.required_skills.map((skill: string, index: number) => (
                                  <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {offer.suggested_salary_range && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-800">Salaire:</span>
                              <span className="text-sm bg-green-200 text-green-900 px-2 py-1 rounded-lg font-bold">
                                {offer.suggested_salary_range}
                              </span>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">📍 Lieu:</span>
                              <span>{offer.ville}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">📅 Publiée le:</span>
                              <span>{formatJobOffer.formatDate(offer.date_offre)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">🔢 Postes:</span>
                              <span className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded">
                                {formatJobOffer.formatNumberOfPositions(offer.nbre_postes)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Offers;
