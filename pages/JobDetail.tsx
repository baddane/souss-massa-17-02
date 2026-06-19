import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jobOffersService, formatJobOffer } from '../services/jobOffersService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import SEO, { generateJobPostingJsonLd } from '../components/SEO';

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const data = await jobOffersService.getJobOfferById(id);
        setOffer(data);
      } catch {
        setOffer(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleApply = () => {
    if (!isAuthenticated) {
      toast.info('Connectez-vous pour postuler rapidement.');
      navigate('/connexion');
      return;
    }
    toast.success('Candidature envoyee !');
    setApplied(true);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Offre introuvable</h1>
        <p className="text-gray-500 mb-6">Cette offre n'existe plus ou a ete retiree.</p>
        <Link to="/offres" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700">
          Voir toutes les offres
        </Link>
      </div>
    );
  }

  const jsonLd = generateJobPostingJsonLd(offer);

  return (
    <>
      <SEO
        title={`${offer.emploi_metier} - ${offer.raison_sociale} - ${offer.ville}`}
        description={offer.meta_description || `Offre ${offer.type_contrat} : ${offer.emploi_metier} chez ${offer.raison_sociale} a ${offer.ville}. Postulez maintenant sur SoussMassa-RH.`}
        canonical={`/emploi/${offer.id}`}
        type="article"
        jsonLd={jsonLd}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-6" aria-label="Fil d'Ariane">
          <Link to="/" className="hover:text-blue-600">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/offres" className="hover:text-blue-600">Offres</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{offer.emploi_metier}</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl font-bold flex-shrink-0">
                {offer.raison_sociale.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold">{offer.emploi_metier}</h1>
                <p className="text-blue-100 text-lg mt-1">{offer.raison_sociale}</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{offer.type_contrat}</span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{offer.ville}</span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{formatJobOffer.formatNumberOfPositions(offer.nbre_postes)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleApply}
                disabled={applied}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  applied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200'
                }`}
              >
                {applied ? 'Candidature envoyee' : 'Postuler maintenant'}
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: offer.emploi_metier, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Lien copie !');
                  }
                }}
                className="px-6 py-4 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-all"
              >
                Partager
              </button>
            </div>

            {offer.suggested_salary_range && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-sm text-green-700 font-medium">Salaire estimé</p>
                  <p className="text-lg font-bold text-green-900">{offer.suggested_salary_range}</p>
                </div>
              </div>
            )}

            {offer.full_description && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Description du poste</h2>
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">{offer.full_description}</div>
              </div>
            )}

            {offer.required_skills && offer.required_skills.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Competences requises</h2>
                <div className="flex flex-wrap gap-2">
                  {offer.required_skills.map((skill: string, i: number) => (
                    <span key={i} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">Informations</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Entreprise</dt>
                  <dd className="font-medium text-gray-900">{offer.raison_sociale}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Lieu</dt>
                  <dd className="font-medium text-gray-900">{offer.ville}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Type de contrat</dt>
                  <dd className="font-medium text-gray-900">{formatJobOffer.formatContractType(offer.type_contrat)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Date de publication</dt>
                  <dd className="font-medium text-gray-900">{formatJobOffer.formatDate(offer.date_offre)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Reference</dt>
                  <dd className="font-medium text-gray-900">{offer.ref_offre}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Nombre de postes</dt>
                  <dd className="font-medium text-gray-900">{offer.nbre_postes}</dd>
                </div>
              </dl>
            </div>

            <div className="text-center pt-4">
              <Link to="/offres" className="text-blue-600 font-medium hover:underline">
                Voir toutes les offres d'emploi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default JobDetail;
