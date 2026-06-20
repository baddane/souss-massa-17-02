import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobOffersService, formatJobOffer } from '../services/jobOffersService';
import { toast } from 'react-toastify';
import SEO, { generateJobPostingJsonLd } from '../components/SEO';
import ApplyModal from '../components/ApplyModal';

const JobDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const data = await jobOffersService.getJobOfferBySlug(slug);
        setOffer(data);
      } catch {
        setOffer(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

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
        <p className="text-gray-500 mb-6">Cette offre n'existe plus ou a été retirée.</p>
        <Link to="/offres" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700">
          Voir toutes les offres
        </Link>
      </div>
    );
  }

  const jsonLd = generateJobPostingJsonLd(offer);
  const descParagraphs = (offer.full_description || '').split('\n\n').filter((p: string) => p.trim());

  return (
    <>
      <SEO
        title={`${offer.emploi_metier} ${offer.ville} - ${offer.raison_sociale}`}
        description={offer.meta_description || `Offre ${offer.type_contrat} : ${offer.emploi_metier} à ${offer.ville} chez ${offer.raison_sociale}. Postulez maintenant.`}
        canonical={`/emploi/${offer.slug}`}
        type="article"
        jsonLd={jsonLd}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-blue-600">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/offres" className="hover:text-blue-600">Offres</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{offer.emploi_metier} - {offer.ville}</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
            <h1 className="text-2xl md:text-3xl font-bold">{offer.emploi_metier}</h1>
            <p className="text-blue-100 text-lg mt-1">{offer.raison_sociale} — {offer.ville}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{offer.type_contrat}</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{formatJobOffer.formatNumberOfPositions(offer.nbre_postes)}</span>
              {offer.suggested_salary_range && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{offer.suggested_salary_range}</span>
              )}
            </div>
          </div>

          <div className="p-8 space-y-8">
            <button
              onClick={() => setShowApplyModal(true)}
              className="w-full py-4 rounded-xl font-bold text-lg bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all"
            >
              Postuler maintenant
            </button>

            {descParagraphs.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Description du poste</h2>
                {descParagraphs.map((p: string, i: number) => (
                  <p key={i} className="text-gray-600 leading-relaxed">{p}</p>
                ))}
              </div>
            )}

            {offer.required_skills && offer.required_skills.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Compétences requises</h2>
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
                  <dt className="text-gray-500">Nombre de postes</dt>
                  <dd className="font-medium text-gray-900">{offer.nbre_postes}</dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowApplyModal(true)}
                className="flex-1 py-4 rounded-xl font-bold text-lg bg-orange-500 text-white hover:bg-orange-600 transition-all"
              >
                Postuler maintenant
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: offer.emploi_metier, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Lien copié !');
                  }
                }}
                className="px-6 py-4 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-all"
              >
                Partager
              </button>
            </div>

            <div className="text-center">
              <Link to="/offres" className="text-blue-600 font-medium hover:underline">
                Voir toutes les offres d'emploi
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ApplyModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        jobTitle={offer.emploi_metier}
        jobRef={offer.ref_offre}
        companyName={offer.raison_sociale}
      />
    </>
  );
};

export default JobDetail;
