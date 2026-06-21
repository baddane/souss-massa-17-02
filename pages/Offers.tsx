
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jobOffersService, formatJobOffer } from '../services/jobOffersService';
import SEO from '../components/SEO';
import ApplyModal from '../components/ApplyModal';

const OFFERS_PER_PAGE = 20;

const CONTRACT_TYPES = [
  { value: '', label: 'Tous types de contrats' },
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'Stage', label: 'Stage' },
  { value: 'Alternance', label: 'Alternance' },
];

const SECTORS = [
  { value: '', label: 'Tous les secteurs' },
  { value: 'informatique', label: 'Informatique & IT' },
  { value: 'commercial', label: 'Commerce & Vente' },
  { value: 'administratif', label: 'Administration' },
  { value: 'industrie', label: 'Industrie' },
  { value: 'sante', label: 'Santé' },
  { value: 'enseignement', label: 'Éducation' },
  { value: 'tourisme', label: 'Tourisme & Hôtellerie' },
  { value: 'construction', label: 'BTP & Construction' },
];

const Offers: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [contractType, setContractType] = useState<string>('');
  const [sector, setSector] = useState(searchParams.get('sector') || '');
  const [page, setPage] = useState(1);

  const [applyOffer, setApplyOffer] = useState<any>(null);

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
        const hasFilters = search || city || jobTitle || contractType || sector;
        if (hasFilters) {
          const filters = {
            city: city || undefined,
            contractType: contractType || undefined,
            jobTitle: jobTitle || undefined,
            keywords: search || undefined,
            sector: sector || undefined,
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
  }, [search, city, contractType, sector, searchParams]);

  const handleApply = (offer: any) => {
    setApplyOffer(offer);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => resultsHeadingRef.current?.focus(), 100);
  };

  const offersCountLabel = loading
    ? 'Chargement…'
    : `${allOffers.length} offre${allOffers.length !== 1 ? 's' : ''}`;

  const CATEGORY_LABELS: Record<string, string> = {
    informatique: 'Informatique & IT',
    commercial: 'Commerce & Vente',
    administratif: 'Administration',
    industrie: 'Industrie',
    sante: 'Santé',
    enseignement: 'Éducation',
    tourisme: 'Tourisme & Hôtellerie',
    construction: 'BTP & Construction',
  };
  const seoCity = searchParams.get('city') || '';
  const seoQuery = searchParams.get('q') || '';
  const seoSector = sector || '';
  const sectorLabel = SECTORS.find(s => s.value === seoSector)?.label || '';
  const seoTitle = seoSector
    ? `Offres d'emploi ${sectorLabel} - Souss-Massa`
    : seoCity
    ? `Offres d'emploi a ${seoCity} - Souss-Massa`
    : seoQuery
    ? `Offres d'emploi : ${CATEGORY_LABELS[seoQuery] || seoQuery} - Souss-Massa`
    : "Toutes les offres d'emploi - Souss-Massa";

  return (
    <>
    <SEO
      title={seoTitle}
      description={`${allOffers.length} offres d'emploi ${seoCity ? 'a ' + seoCity : ''} dans la region Souss-Massa. CDI, CDD, Stage. Postulez gratuitement.`}
      canonical={`/offres${window.location.search}`}
    />
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Barre de filtres compacte */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un poste…"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">Toutes les villes</option>
            <option value="Agadir">Agadir</option>
            <option value="Marrakech">Marrakech</option>
            <option value="Essaouira">Essaouira</option>
            <option value="Taroudant">Taroudant</option>
            <option value="Inezgane">Inezgane</option>
          </select>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {CONTRACT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {SECTORS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* En-tête résultats */}
      <div className="flex items-center justify-between mb-4">
        <h1
          ref={resultsHeadingRef}
          tabIndex={-1}
          className="text-xl font-bold text-gray-900 outline-none"
        >
          Offres d'emploi — Souss-Massa
        </h1>
        <span
          role="status"
          aria-live="polite"
          className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
        >
          {offersCountLabel}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : loadError ? (
        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100">
          <p className="text-red-600 font-medium">Impossible de charger les offres.</p>
          <p className="text-red-400 text-sm mt-1">Veuillez rafraîchir la page ou réessayer plus tard.</p>
        </div>
      ) : allOffers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Aucune offre trouvée</p>
          <p className="text-gray-400 mt-1 text-sm">Essayez de modifier vos critères de recherche</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((offer) => (
            <article key={offer.id} className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-colors overflow-hidden">
              {/* En-tête de l'offre */}
              <div className="p-5 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-lg text-blue-800">{offer.emploi_metier}</h2>
                    <p className="text-gray-700 font-medium mt-0.5">{offer.raison_sociale}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded text-xs font-semibold">
                        {formatJobOffer.formatContractType(offer.type_contrat)}
                      </span>
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded text-xs">
                        {offer.ville}
                      </span>
                      <span className="bg-green-50 text-green-700 px-2.5 py-0.5 rounded text-xs">
                        {formatJobOffer.formatNumberOfPositions(offer.nbre_postes)}
                      </span>
                      {offer.suggested_salary_range && (
                        <span className="bg-yellow-50 text-yellow-800 px-2.5 py-0.5 rounded text-xs font-medium">
                          {offer.suggested_salary_range}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleApply(offer)}
                    className="px-5 py-2 rounded-lg font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors text-sm whitespace-nowrap self-start"
                  >
                    Postuler
                  </button>
                </div>
              </div>

              {/* Description + détails — toujours visibles */}
              <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                {(offer.full_description || '').split('\n\n').filter((p: string) => p.trim()).map((p: string, i: number) => (
                  <p key={i} className="text-gray-600 text-sm leading-relaxed mb-2">{p}</p>
                ))}

                {offer.required_skills && offer.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {offer.required_skills.map((skill: string, i: number) => (
                      <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
                  <span>Publiée le {formatJobOffer.formatDate(offer.date_offre)}</span>
                  <a href={`/emploi/${offer.slug}`} className="text-blue-500 hover:underline">Voir l'offre</a>
                </div>
              </div>
            </article>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-6">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
              >
                Précédent
              </button>
              <span className="text-sm text-gray-600">
                Page <strong>{page}</strong> / <strong>{totalPages}</strong>
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-40 hover:bg-gray-50"
              >
                Suivant
              </button>
            </nav>
          )}
        </div>
      )}
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
