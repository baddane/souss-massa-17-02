
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { jobOffersService, formatJobOffer } from '../services/jobOffersService';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SEO, { slugify } from '../components/SEO';
import ApplyModal from '../components/ApplyModal';

// Safe markdown-like renderer (no dangerouslySetInnerHTML)
const SafeDescription: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="text-gray-600 leading-relaxed text-sm space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <br key={i} />;
        if (trimmed.startsWith('### '))
          return <h5 key={i} className="font-bold text-gray-800 mt-4 mb-2 border-b border-gray-200 pb-2">{trimmed.slice(4)}</h5>;
        if (trimmed.startsWith('## '))
          return <h6 key={i} className="font-semibold text-gray-800 mt-3 mb-2">{trimmed.slice(3)}</h6>;
        if (trimmed.startsWith('# '))
          return <h4 key={i} className="font-bold text-gray-900 mt-6 mb-3 text-lg">{trimmed.slice(2)}</h4>;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* '))
          return <p key={i}>&#8226; {renderInlineFormatting(trimmed.slice(2))}</p>;
        if (/^\d+\.\s/.test(trimmed))
          return <p key={i}>{renderInlineFormatting(trimmed)}</p>;
        return <p key={i}>{renderInlineFormatting(trimmed)}</p>;
      })}
    </div>
  );
};

function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    const italicMatch = remaining.match(/\*(.*?)\*/);
    const match = boldMatch && (!italicMatch || (boldMatch.index! <= italicMatch.index!)) ? boldMatch : italicMatch;
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }
    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }
    if (match[0].startsWith('**')) {
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else {
      parts.push(<em key={key++}>{match[1]}</em>);
    }
    remaining = remaining.slice(match.index + match[0].length);
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

const OFFERS_PER_PAGE = 20;

const CONTRACT_TYPES = [
  { value: '', label: 'Tous types de contrats' },
  { value: 'CDI', label: 'CDI — Contrat à durée indéterminée' },
  { value: 'CDD', label: 'CDD — Contrat à durée déterminée' },
  { value: 'Stage', label: 'Stage — Formation professionnelle' },
  { value: 'Alternance', label: 'Alternance — Études et travail' },
];

const Offers: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [contractType, setContractType] = useState<string>('');
  const [page, setPage] = useState(1);

  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());
  const [applyOffer, setApplyOffer] = useState<any>(null);

  // Ref pour déplacer le focus en haut de la liste après changement de page
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  const totalPages = Math.max(1, Math.ceil(allOffers.length / OFFERS_PER_PAGE));
  const filteredOffers = useMemo(() => {
    const start = (page - 1) * OFFERS_PER_PAGE;
    return allOffers.slice(start, start + OFFERS_PER_PAGE);
  }, [allOffers, page]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const jobTitle = searchParams.get('jobTitle') || '';
        const hasFilters = search || city || jobTitle || contractType;
        if (hasFilters) {
          const filters = {
            city: city || undefined,
            contractType: contractType || undefined,
            jobTitle: jobTitle || undefined,
            keywords: search || undefined,
          };
          const offers = await jobOffersService.searchJobOffers(filters);
          setAllOffers(offers);
        } else {
          const offers = await jobOffersService.getAllJobOffers();
          setAllOffers(offers);
        }
        setPage(1);
      } catch (error) {
        console.error('Error loading job offers:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }, search ? 400 : 0);

    return () => clearTimeout(timer);
  }, [search, city, contractType, searchParams]);

  const handleApply = (offer: any) => {
    setApplyOffer(offer);
  };

  const toggleDescription = (offerId: string) => {
    setExpandedOffers((prev) => {
      const next = new Set(prev);
      if (next.has(offerId)) {
        next.delete(offerId);
      } else {
        next.add(offerId);
      }
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Déplace le focus vers le titre de résultats pour les utilisateurs clavier
    setTimeout(() => resultsHeadingRef.current?.focus(), 100);
  };

  const offersCountLabel = loading
    ? 'Chargement…'
    : `${allOffers.length} offre${allOffers.length !== 1 ? 's' : ''} disponible${allOffers.length !== 1 ? 's' : ''}`;

  const seoCity = searchParams.get('city') || '';
  const seoQuery = searchParams.get('q') || '';
  const seoTitle = seoCity
    ? `Offres d'emploi a ${seoCity} - Souss-Massa`
    : seoQuery
    ? `Offres d'emploi : ${seoQuery} - Souss-Massa`
    : "Toutes les offres d'emploi - Souss-Massa";

  return (
    <>
    <SEO
      title={seoTitle}
      description={`${allOffers.length} offres d'emploi ${seoCity ? 'a ' + seoCity : ''} dans la region Souss-Massa. CDI, CDD, Stage. Postulez gratuitement.`}
      canonical={`/offres${window.location.search}`}
    />
    <div id="main-content" className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Sidebar filtres */}
        <aside aria-label="Filtres de recherche" className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filtrer les offres
            </h2>

            <div className="space-y-4">
              {/* Recherche poste */}
              <div>
                <label htmlFor="filter-search" className="block text-sm font-medium text-gray-700 mb-2">
                  Rechercher un poste
                </label>
                <input
                  id="filter-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ex : développeur, caissier, infirmier…"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Ville */}
              <div>
                <label htmlFor="filter-city" className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                <select
                  id="filter-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Toutes les villes</option>
                  <option value="Agadir">Agadir</option>
                  <option value="Marrakech">Marrakech</option>
                  <option value="Essaouira">Essaouira</option>
                  <option value="Taroudant">Taroudant</option>
                  <option value="Inezgane">Inezgane</option>
                </select>
              </div>

              {/* Type de contrat — fieldset pour l'accessibilité */}
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-3">
                  Type de contrat
                </legend>
                <div className="space-y-2">
                  {CONTRACT_TYPES.map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <input
                        type="radio"
                        name="contract"
                        value={value}
                        checked={contractType === value}
                        onChange={() => setContractType(value)}
                        className="text-blue-600"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          {/* Conseils */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-blue-900 mb-3">Conseils de recherche</h3>
            <div className="text-blue-800 text-sm space-y-2">
              <p><strong>Par ville :</strong> Agadir, Marrakech, Essaouira, Taroudant</p>
              <p><strong>Types d'emploi :</strong> CDI, CDD, Stage, Alternance</p>
              <p><strong>Mots-clés :</strong> caissier, développeur, infirmier, technicien</p>
            </div>
          </div>
        </aside>

        {/* Résultats */}
        <main className="lg:col-span-3 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1
                ref={resultsHeadingRef}
                tabIndex={-1}
                className="text-2xl lg:text-3xl font-bold text-gray-900 outline-none"
              >
                Offres d'emploi — Souss-Massa
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                Trouvez votre emploi idéal dans la région Souss-Massa (CDI, CDD, Stage, Alternance)
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium"
              >
                {offersCountLabel}
              </span>
              <span className="text-gray-500">
                <svg className="w-4 h-4 inline mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Souss-Massa, Maroc
              </span>
            </div>
          </div>

          {loading ? (
            <div role="status" aria-label="Chargement des offres" className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden="true" />
            </div>
          ) : loadError ? (
            <div role="alert" className="text-center py-12 bg-red-50 rounded-xl border border-red-100">
              <p className="text-red-600 font-medium">Impossible de charger les offres.</p>
              <p className="text-red-400 text-sm mt-1">Veuillez rafraîchir la page ou réessayer plus tard.</p>
            </div>
          ) : allOffers.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-gray-500 text-lg">Aucune offre trouvée</h3>
              <p className="text-gray-400 mt-2">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOffers.map((offer) => {
                const isExpanded = expandedOffers.has(offer.id);
                const descId = `desc-${offer.id}`;

                return (
                  <article key={offer.id} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-400 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex items-center space-x-4 flex-1">
                        <div
                          className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                          aria-hidden="true"
                        >
                          {offer.raison_sociale.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-bold text-lg text-gray-900">
                            <Link to={`/emploi/${offer.id}/${slugify(offer.emploi_metier)}-${slugify(offer.ville)}`} className="hover:text-blue-700 transition-colors">
                              {offer.emploi_metier}
                            </Link>
                          </h2>
                          <p className="text-gray-600 font-medium truncate">{offer.raison_sociale}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                              {formatJobOffer.formatContractType(offer.type_contrat)}
                            </span>
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                              {offer.ville}
                            </span>
                            <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                              {formatJobOffer.formatNumberOfPositions(offer.nbre_postes)}
                            </span>
                            {offer.source === 'anapec' && (
                              <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-semibold">
                                ANAPEC
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApply(offer)}
                          aria-label={`Postuler à ${offer.emploi_metier} chez ${offer.raison_sociale}`}
                          className="px-6 py-2 rounded-lg font-bold transition-all bg-orange-500 text-white hover:bg-orange-600"
                        >
                          Postuler
                        </button>
                        <span className="text-xs text-gray-400 text-center">
                          Réf : {offer.ref_offre}
                        </span>
                      </div>
                    </div>

                    {/* Description expansible */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => toggleDescription(offer.id)}
                        aria-expanded={isExpanded}
                        aria-controls={descId}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors w-full justify-between"
                      >
                        <span className="font-semibold text-sm">Description du poste</span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                        )}
                      </button>

                      <div
                        id={descId}
                        className={`mt-3 transition-all duration-300 ease-in-out ${
                          isExpanded
                            ? 'max-h-[600px] opacity-100 overflow-y-auto'
                            : 'max-h-0 opacity-0 overflow-hidden'
                        }`}
                        aria-hidden={!isExpanded}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <SafeDescription text={offer.full_description || ''} />
                          </div>

                          <div className="space-y-4">
                            {offer.required_skills && offer.required_skills.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-gray-800 mb-2">Compétences requises</p>
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
                                <span className="text-sm font-semibold text-gray-800">Salaire :</span>
                                <span className="text-sm bg-green-100 text-green-900 px-2 py-1 rounded-lg font-bold">
                                  {offer.suggested_salary_range}
                                </span>
                              </div>
                            )}

                            <dl className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                              <div className="flex items-center gap-2">
                                <dt className="font-semibold">Lieu :</dt>
                                <dd>{offer.ville}</dd>
                              </div>
                              <div className="flex items-center gap-2">
                                <dt className="font-semibold">Publiée le :</dt>
                                <dd><time dateTime={offer.date_offre}>{formatJobOffer.formatDate(offer.date_offre)}</time></dd>
                              </div>
                              <div className="flex items-center gap-2">
                                <dt className="font-semibold">Postes :</dt>
                                <dd className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded">
                                  {formatJobOffer.formatNumberOfPositions(offer.nbre_postes)}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <nav aria-label="Pagination des offres" className="flex items-center justify-center gap-3 pt-6">
                  <button
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                    aria-label="Page précédente"
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Précédent
                  </button>
                  <span className="text-sm text-gray-600" aria-live="polite" aria-atomic="true">
                    Page <strong>{page}</strong> sur <strong>{totalPages}</strong>
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    aria-label="Page suivante"
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Suivant
                  </button>
                </nav>
              )}
            </div>
          )}
        </main>
      </div>
    </div>

    {applyOffer && (
      <ApplyModal
        isOpen={!!applyOffer}
        onClose={() => setApplyOffer(null)}
        jobTitle={applyOffer.emploi_metier}
        jobRef={applyOffer.ref_offre}
        companyName={applyOffer.raison_sociale}
      />
    )}
    </>
  );
};

export default Offers;
