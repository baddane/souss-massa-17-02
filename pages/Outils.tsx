import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const SITE_URL = 'https://www.soussmassa-rh.com';

export const OUTILS = [
  {
    slug: 'cv',
    emoji: '📄',
    titre: 'Générateur de CV',
    desc: 'Créez un CV professionnel et moderne en quelques minutes. Plusieurs modèles, aperçu en direct, export PDF. 100 % gratuit et privé.',
    tag: 'Le plus utilisé',
  },
  {
    slug: 'lettre-motivation',
    emoji: '✉️',
    titre: 'Lettre de motivation',
    desc: 'Rédigez une lettre structurée et percutante grâce à un cadre guidé (accroche, vous-moi-nous) et une bibliothèque de formulations.',
    tag: '',
  },
  {
    slug: 'salaire-net',
    emoji: '💰',
    titre: 'Salaire net au Maroc',
    desc: 'Calculez votre salaire net à partir du brut : CNSS, AMO, IR (barème 2025) et frais professionnels. Idéal avant un entretien ou une offre.',
    tag: 'Exclusif',
  },
  {
    slug: 'analyse-cv',
    emoji: '🔎',
    titre: 'Analyse de CV',
    desc: 'Obtenez un score et des conseils concrets sur votre CV : complétude, verbes d’action, résultats chiffrés, mots-clés face à une offre.',
    tag: '',
  },
  {
    slug: 'projet-professionnel',
    emoji: '🎯',
    titre: 'Projet professionnel',
    desc: 'Clarifiez votre orientation : test d’intérêts (RIASEC), bilan de vos atouts, objectifs SMART et plan d’action imprimable.',
    tag: 'Inventif',
  },
];

const Outils: React.FC = () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Outils pour chercheurs d’emploi — SoussMassa-RH',
    itemListElement: OUTILS.map((o, i) => ({
      '@type': 'ListItem', position: i + 1, name: o.titre, url: `${SITE_URL}/outils/${o.slug}`,
    })),
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <SEO
        title="Outils gratuits pour chercheurs d’emploi : CV, salaire net, projet professionnel"
        description="Boîte à outils gratuite pour votre recherche d’emploi à Souss-Massa : générateur de CV, lettre de motivation, calcul du salaire net au Maroc, analyse de CV et projet professionnel. Sans inscription, 100 % privé."
        canonical="/outils"
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 sm:p-12 text-white mb-8">
        <p className="text-blue-200 font-semibold text-sm uppercase tracking-widest mb-2">Boîte à outils candidat</p>
        <h1 className="text-3xl sm:text-4xl font-black mb-3">Des outils gratuits pour réussir votre recherche d’emploi</h1>
        <p className="text-blue-100 max-w-2xl">
          Des outils de qualité, sans inscription et <strong>sans intelligence artificielle</strong> : vos données
          restent dans votre navigateur. Construisez votre CV, calculez votre salaire net, préparez votre projet.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {OUTILS.map((o) => (
          <Link key={o.slug} to={`/outils/${o.slug}`}
            className="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="text-4xl">{o.emoji}</div>
              {o.tag && <span className="text-[11px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{o.tag}</span>}
            </div>
            <h2 className="font-black text-gray-900 text-lg mb-1.5">{o.titre}</h2>
            <p className="text-gray-500 text-sm flex-1">{o.desc}</p>
            <span className="inline-block mt-4 text-blue-600 font-bold text-sm group-hover:underline">Ouvrir l’outil →</span>
          </Link>
        ))}
      </div>

      <div className="mt-10 bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-600">
        <p className="font-bold text-gray-900 mb-1">🔒 Confidentialité</p>
        Tous ces outils fonctionnent <strong>entièrement dans votre navigateur</strong>. Aucune donnée (CV, salaire,
        réponses) n’est envoyée à nos serveurs : vos informations sont enregistrées localement et vous seul y avez accès.
      </div>
    </div>
  );
};

export default Outils;
