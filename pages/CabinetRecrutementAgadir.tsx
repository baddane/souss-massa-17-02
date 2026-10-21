import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabaseOffers } from '../src/services/supabase';

const SITE_URL = 'https://www.soussmassa-rh.com';

// Landing SEO « cabinet de recrutement Agadir ». Positionnement HONNÊTE :
// SoussMassa-RH n'est pas un cabinet, c'est l'alternative gratuite en
// self-service (CVthèque + dépôt d'offres), sans intermédiaire ni commission.
const COMPARISON = [
  { crit: 'Coût', cabinet: 'Honoraires élevés (souvent 1 à 2 mois de salaire par recrutement)', nous: 'Gratuit — inscription et CVthèque sans frais' },
  { crit: 'Délai', cabinet: 'Plusieurs semaines via l’agence', nous: 'Immédiat : vous cherchez les profils vous-même' },
  { crit: 'Base de candidats', cabinet: 'Le vivier privé du cabinet', nous: 'CVthèque régionale Souss-Massa, filtrable par métier/ville/diplôme' },
  { crit: 'Contrôle', cabinet: 'L’agence présélectionne pour vous', nous: 'Vous gardez la main du début à la fin' },
  { crit: 'Portée', cabinet: 'Réseau du cabinet', nous: 'Vos offres indexées sur Google for Jobs' },
];

const STEPS = [
  { n: 1, titre: 'Créez votre compte entreprise', texte: 'Inscription en ligne gratuite, en quelques minutes. Aucune commission.' },
  { n: 2, titre: 'Publiez votre offre ou cherchez dans la CVthèque', texte: 'Diffusez votre annonce à Agadir et/ou contactez directement des profils de la CVthèque régionale.' },
  { n: 3, titre: 'Sélectionnez et recrutez', texte: 'Recevez les candidatures, téléchargez les CV, menez vos entretiens — sans intermédiaire.' },
];

const FAQ = [
  { q: 'SoussMassa-RH est-il un cabinet de recrutement ?', r: 'Non. SoussMassa-RH est le portail emploi régional de la Souss-Massa : une plateforme en self-service qui vous permet de recruter vous-même, gratuitement, via la CVthèque et la publication d’offres. Ce n’est pas une agence de recrutement qui réalise la mission à votre place contre honoraires.' },
  { q: 'Peut-on recruter à Agadir sans passer par un cabinet de recrutement ?', r: 'Oui. Avec la CVthèque régionale et la publication d’offres gratuites, vous accédez directement aux candidats d’Agadir et de la région, sans intermédiaire ni commission.' },
  { q: 'Combien coûte le recrutement sur SoussMassa-RH ?', r: 'L’inscription entreprise, la publication d’offres et l’accès à la CVthèque sont gratuits. Là où un cabinet facture des honoraires par recrutement, la plateforme est sans frais.' },
  { q: 'Comment accéder aux CV des candidats d’Agadir ?', r: 'Créez un compte entreprise, puis accédez à la CVthèque : vous filtrez les profils par métier, ville, diplôme, compétence et expérience, et téléchargez les CV.' },
  { q: 'Dans quels cas un cabinet de recrutement reste-t-il utile ?', r: 'Pour des recrutements de cadres très spécialisés ou une externalisation complète du processus, un cabinet peut apporter un accompagnement sur mesure. Pour la majorité des recrutements locaux à Agadir, une plateforme self-service gratuite suffit.' },
];

const CabinetRecrutementAgadir: React.FC = () => {
  const [count, setCount] = useState(213);
  useEffect(() => {
    supabaseOffers.rpc('public_marketing_stats').then(({ data }: any) => {
      if (data?.cvtheque) setCount(data.cvtheque);
    }, () => {});
  }, []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'Recrutement en ligne à Agadir — alternative au cabinet de recrutement',
        serviceType: 'Plateforme de recrutement en ligne et CVthèque',
        description: 'Alternative gratuite au cabinet de recrutement à Agadir : publiez vos offres et accédez à la CVthèque régionale pour recruter vous-même, sans intermédiaire ni commission.',
        areaServed: { '@type': 'City', name: 'Agadir, Souss-Massa, Maroc' },
        provider: { '@type': 'Organization', name: 'SoussMassa-RH', url: SITE_URL },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'MAD' },
        url: `${SITE_URL}/cabinet-recrutement-agadir`,
      },
      { '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })) },
    ],
  };

  return (
    <div>
      <SEO
        title="Cabinet de recrutement à Agadir ? L’alternative gratuite pour recruter"
        description="Vous cherchez un cabinet de recrutement à Agadir ? Recrutez vous-même, gratuitement et sans commission : publiez vos offres et accédez à la CVthèque régionale de candidats de la Souss-Massa."
        canonical="/cabinet-recrutement-agadir"
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center">
          <p className="text-blue-200 font-semibold uppercase tracking-widest text-sm mb-3">Recruteurs · Agadir &amp; Souss-Massa</p>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-4">Cabinet de recrutement à Agadir ?<br className="hidden sm:block" /> L’alternative gratuite</h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
            Pas besoin d’un cabinet de recrutement ni de commission pour recruter à Agadir. Publiez vos offres
            et accédez à <strong>{count}+ CV</strong> de candidats de la région via la CVthèque — gratuitement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/inscription-entreprise" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
              Recruter gratuitement à Agadir
            </Link>
            <Link to="/cvtheque-gratuite" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
              Voir la CVthèque gratuite
            </Link>
          </div>
        </div>
      </section>

      {/* Intro SEO */}
      <section className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Recruter à Agadir sans cabinet de recrutement</h2>
        <p className="text-gray-600 leading-relaxed">
          Les entreprises qui cherchent un <strong>cabinet de recrutement à Agadir</strong> veulent une seule chose :
          trouver rapidement les bons candidats. SoussMassa-RH répond à ce besoin autrement — en vous donnant les
          outils pour recruter <strong>vous-même</strong>, <strong>gratuitement</strong> et sans intermédiaire :
          une <Link to="/cvtheque-gratuite" className="text-blue-600 hover:underline">CVthèque régionale</Link> et la
          <Link to="/recruter/agadir" className="text-blue-600 hover:underline"> publication d’offres à Agadir</Link>.
        </p>
      </section>

      {/* Comparatif */}
      <section className="max-w-4xl mx-auto px-4 pb-4">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-8">Cabinet de recrutement vs SoussMassa-RH</h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-4 text-start font-semibold"> </th>
                <th className="p-4 text-start font-semibold">Cabinet de recrutement</th>
                <th className="p-4 text-start font-semibold text-blue-700">SoussMassa-RH</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((r) => (
                <tr key={r.crit} className="border-t border-gray-100 align-top">
                  <td className="p-4 font-bold text-gray-900 whitespace-nowrap">{r.crit}</td>
                  <td className="p-4 text-gray-500">{r.cabinet}</td>
                  <td className="p-4 text-gray-800">{r.nous}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-gray-400 text-xs mt-3 text-center">SoussMassa-RH est un portail emploi self-service, pas une agence de recrutement.</p>
      </section>

      {/* Étapes */}
      <section className="bg-white border-y border-gray-100 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-10">Comment recruter à Agadir sans cabinet</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-black flex items-center justify-center mx-auto mb-4">{s.n}</div>
                <h3 className="font-bold text-gray-900 mb-1.5">{s.titre}</h3>
                <p className="text-gray-600 text-sm">{s.texte}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/inscription-entreprise" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
              Créer mon compte entreprise gratuit
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-8">Questions fréquentes</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="bg-white border border-gray-200 rounded-xl p-5 group">
              <summary className="font-bold text-gray-900 cursor-pointer list-none flex justify-between items-center">
                {f.q}
                <span className="text-blue-600 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-gray-600 text-sm mt-3 leading-relaxed">{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Recrutez à Agadir, sans intermédiaire</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">Créez votre compte entreprise gratuit et accédez dès aujourd’hui aux candidats de la région Souss-Massa.</p>
          <Link to="/inscription-entreprise" className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
            Recruter gratuitement à Agadir
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CabinetRecrutementAgadir;
