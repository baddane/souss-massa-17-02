import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import SEO, { slugify } from '../components/SEO';
import { supabaseOffers } from '../src/services/supabase';

const SITE_URL = 'https://www.soussmassa-rh.com';

// Villes couvertes par une page recruteur dédiée (maillage SEO longue traîne)
const RECRUITER_CITIES = ['Agadir', 'Inezgane', 'Aït Melloul', 'Taroudant', 'Tiznit', 'Oulad Teima', 'Biougra'];

const BENEFITS = [
  { icon: '🎯', titre: 'Une audience 100 % régionale', texte: "Votre offre est vue par des candidats de la région Souss-Massa — pas par un trafic national dilué." },
  { icon: '⚡', titre: 'Dépôt d’offre simple et rapide', texte: 'Créez votre compte entreprise et publiez votre annonce en quelques minutes. Chaque offre est vérifiée avant mise en ligne.' },
  { icon: '📄', titre: 'Accès à la CVthèque', texte: 'Recherchez directement des profils par métier, ville, diplôme, compétence ou expérience, sans attendre les candidatures.' },
  { icon: '🔎', titre: 'Visibilité sur Google', texte: 'Chaque offre dispose d’une page optimisée SEO (données structurées Google for Jobs) : elle est indexée et référencée automatiquement.' },
  { icon: '💰', titre: 'Des repères de salaires', texte: 'Positionnez votre offre grâce à notre grille des salaires régionale par secteur, pour attirer les bons profils.' },
  { icon: '✅', titre: 'Gratuit pour démarrer', texte: 'Publiez vos premières offres sans frais et testez la qualité des candidatures de la région.' },
];

const STEPS = [
  { n: 1, titre: 'Créez votre compte entreprise', texte: 'Inscription en ligne, validée par notre équipe.' },
  { n: 2, titre: 'Déposez votre offre', texte: 'Intitulé, ville, contrat, description : votre annonce est publiée après vérification.' },
  { n: 3, titre: 'Recevez les candidatures', texte: 'Les candidats postulent en ligne ; vous consultez profils et CV depuis votre espace.' },
];

const Recruter: React.FC = () => {
  const { ville } = useParams<{ ville?: string }>();
  const [stats, setStats] = useState({ candidatures: 175, offres: 370, entreprises: 168 });
  useEffect(() => {
    supabaseOffers.rpc('public_marketing_stats').then(({ data }: any) => {
      if (data) setStats({ candidatures: data.candidatures, offres: data.offres, entreprises: data.entreprises });
    }, () => {});
  }, []);
  const city = ville ? RECRUITER_CITIES.find((c) => slugify(c) === ville) : undefined;

  // Slug de ville présent mais inconnu → on renvoie vers la page générique
  if (ville && !city) return <Navigate to="/recruter" replace />;

  const canonical = city ? `/recruter/${slugify(city)}` : '/recruter';
  const h1 = city ? `Recrutez à ${city}` : 'Recrutez les meilleurs talents de la Souss-Massa';
  const heroText = city
    ? `Publiez vos offres d’emploi à ${city} et dans toute la région Souss-Massa, accédez à la CVthèque régionale et touchez des candidats locaux qualifiés.`
    : 'Publiez vos offres d’emploi, accédez à la CVthèque régionale et touchez une audience ciblée à Agadir, Inezgane, Taroudant, Tiznit et dans toute la région.';
  const seoTitle = city ? `Recruter à ${city} : publier une offre d’emploi` : 'Recruter à Souss-Massa : publiez votre offre d’emploi';
  const seoDesc = city
    ? `Recrutez à ${city} : publiez vos offres d’emploi, accédez à la CVthèque et à une audience régionale ciblée. Dépôt simple, gratuit pour démarrer.`
    : 'Recrutez à Agadir et dans toute la région Souss-Massa : publiez vos offres d’emploi, accédez à la CVthèque et à une audience régionale ciblée. Dépôt simple, gratuit pour démarrer.';

  const FAQ = [
    { q: 'Publier une offre d’emploi est-il gratuit ?', r: 'Oui, vous pouvez créer un compte entreprise et publier vos premières offres gratuitement sur SoussMassa-RH.' },
    { q: `Comment déposer une offre d’emploi à ${city || 'Agadir'} ?`, r: `Créez un compte entreprise, puis remplissez le formulaire de dépôt d’offre (intitulé, ville, type de contrat, description). Votre annonce à ${city || 'Agadir'} est mise en ligne après une rapide vérification.` },
    { q: 'Quels types de contrats puis-je proposer ?', r: 'CDI, CDD, stage, intérim, alternance ou freelance : tous les types de contrats sont acceptés.' },
    { q: 'Comment recevoir et gérer les candidatures ?', r: 'Les candidats postulent directement en ligne. Vous consultez les candidatures et les CV depuis votre espace entreprise.' },
    { q: 'Puis-je consulter des CV sans publier d’offre ?', r: 'Oui, la CVthèque vous permet de rechercher des profils de la région par métier, ville, diplôme, compétence ou années d’expérience.' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: city ? `Recrutement et publication d’offres d’emploi à ${city}` : 'Publication d’offres d’emploi et recrutement dans la région de Souss-Massa',
        serviceType: 'Recrutement en ligne',
        provider: { '@type': 'Organization', name: 'SoussMassa-RH', url: SITE_URL },
        areaServed: { '@type': city ? 'City' : 'AdministrativeArea', name: city ? `${city}, Souss-Massa, Maroc` : 'Souss-Massa, Maroc' },
        url: `${SITE_URL}${canonical}`,
      },
      { '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })) },
    ],
  };

  return (
    <div>
      <SEO title={seoTitle} description={seoDesc} canonical={canonical} jsonLd={jsonLd} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center">
          <p className="text-blue-200 font-semibold uppercase tracking-widest text-sm mb-3">Espace recruteurs{city ? ` · ${city}` : ''}</p>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-4">{h1}</h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">{heroText}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/inscription-entreprise" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
              Déposer une offre gratuitement
            </Link>
            <Link to="/connexion-entreprise" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
              J’ai déjà un compte
            </Link>
          </div>
          <p className="mt-6 inline-block bg-orange-500/25 border border-orange-300/40 text-orange-50 px-4 py-2 rounded-full text-sm font-semibold">
            🎁 Offre de lancement : gratuit + mise en avant pour les 20 premières entreprises inscrites
          </p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-8 text-blue-100 text-sm">
            <span><strong className="text-white">{stats.candidatures}+</strong> candidatures reçues</span>
            <span><strong className="text-white">{stats.offres}</strong> offres en ligne</span>
            <span><strong className="text-white">{stats.entreprises}</strong> entreprises</span>
          </div>
        </div>
      </section>

      {/* Bénéfices */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-3">
          Pourquoi recruter {city ? `à ${city}` : ''} avec SoussMassa-RH ?
        </h2>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-10">Le portail emploi de référence de la région Souss-Massa, pensé pour connecter employeurs et talents locaux.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map((b) => (
            <div key={b.titre} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="text-3xl mb-3">{b.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1.5">{b.titre}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{b.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-10">Comment ça marche ?</h2>
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
              Créer mon compte entreprise
            </Link>
          </div>
        </div>
      </section>

      {/* Repère salaires */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="text-5xl">💰</div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-gray-900 mb-1.5">Quel salaire proposer ?</h2>
            <p className="text-gray-600 text-sm">Consultez notre grille des salaires régionale par secteur, calculée à partir des offres réelles de la région, pour positionner votre offre au juste prix.</p>
          </div>
          <Link to="/observatoire/grille-salaires-souss-massa-2026" className="bg-white border border-blue-200 text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-100 transition-colors whitespace-nowrap">
            Voir la grille
          </Link>
        </div>
      </section>

      {/* Recruter par ville (maillage interne) */}
      <section className="max-w-5xl mx-auto px-4 pb-4">
        <h2 className="text-lg font-black text-gray-900 mb-3">Recruter par ville</h2>
        <div className="flex flex-wrap gap-2">
          {RECRUITER_CITIES.map((c) => {
            const active = city === c;
            return (
              <Link key={c} to={`/recruter/${slugify(c)}`}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                Recruter à {c}
              </Link>
            );
          })}
          {city && (
            <Link to="/recruter" className="px-4 py-2 rounded-full text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:border-blue-300">
              Toute la région
            </Link>
          )}
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
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Prêt à recruter {city ? `à ${city}` : 'à Souss-Massa'} ?</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">Publiez votre première offre dès aujourd’hui et recevez des candidatures de talents de la région.</p>
          <Link to="/inscription-entreprise" className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
            Déposer une offre gratuitement
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Recruter;
