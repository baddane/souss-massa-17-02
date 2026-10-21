import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabaseOffers } from '../src/services/supabase';

const SITE_URL = 'https://www.soussmassa-rh.com';

// Landing SEO ciblée « CVthèque gratuite » : capte les recruteurs qui cherchent
// une base de CV gratuite, puis les convertit en inscription entreprise.
const BENEFITS = [
  { icon: '🆓', titre: '100 % gratuit', texte: "Accédez à la CVthèque régionale sans abonnement ni frais cachés. L'inscription entreprise est gratuite." },
  { icon: '🔎', titre: 'Recherche multicritère', texte: 'Filtrez les profils par métier, ville, quartier, diplôme, compétence et années d’expérience.' },
  { icon: '📍', titre: 'Des profils 100 % régionaux', texte: 'Uniquement des candidats de la région Souss-Massa (Agadir, Inezgane, Taroudant, Tiznit…) — pas de trafic national dilué.' },
  { icon: '📄', titre: 'CV téléchargeables', texte: 'Consultez et téléchargez directement les CV des candidats qui ont consenti à être visibles des recruteurs.' },
  { icon: '⚡', titre: 'Sans attendre les candidatures', texte: 'Recherchez vous-même les profils dont vous avez besoin, au lieu d’attendre qu’ils postulent à vos offres.' },
  { icon: '🔄', titre: 'Mise à jour en continu', texte: 'La base s’enrichit chaque jour des nouveaux CV déposés sur le portail emploi de la région.' },
];

const STEPS = [
  { n: 1, titre: 'Créez votre compte entreprise', texte: 'Inscription en ligne gratuite (nom, e-mail, ville, secteur). Aucune carte bancaire.' },
  { n: 2, titre: 'Votre compte est validé', texte: 'Notre équipe valide votre compte entreprise, puis vous recevez vos accès.' },
  { n: 3, titre: 'Recherchez et téléchargez les CV', texte: 'Accédez à la CVthèque, filtrez par métier/ville/diplôme et téléchargez les CV qui vous intéressent.' },
];

const FAQ = [
  { q: 'La CVthèque est-elle vraiment gratuite ?', r: 'Oui. L’accès à la CVthèque régionale est gratuit pour les entreprises : il suffit de créer un compte entreprise, lui aussi gratuit.' },
  { q: 'Comment accéder à la CVthèque gratuitement ?', r: 'Créez votre compte entreprise sur SoussMassa-RH, puis une fois votre compte validé, l’onglet « CVthèque » de votre espace vous donne accès à la recherche de profils et au téléchargement des CV.' },
  { q: 'Les CV sont-ils récents et de la région ?', r: 'Oui. Les CV proviennent de candidats de la région Souss-Massa qui déposent leur profil sur le portail, et la base est alimentée en continu.' },
  { q: 'Puis-je rechercher par métier et par ville ?', r: 'Oui. La recherche est multicritère : métier/poste, ville, quartier, diplôme, niveau d’études, compétence et années d’expérience.' },
  { q: 'Dois-je publier une offre pour accéder aux CV ?', r: 'Non. L’accès à la CVthèque ne nécessite pas de publier une offre. Vous pouvez chercher des profils directement après validation de votre compte.' },
  { q: 'Les candidats sont-ils d’accord pour être contactés ?', r: 'Seuls les candidats ayant consenti à être visibles des recruteurs apparaissent dans la CVthèque, conformément à la protection des données personnelles.' },
];

const CvthequeGratuite: React.FC = () => {
  const [count, setCount] = useState(213);
  const villes = 14;
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
        name: 'CVthèque gratuite — région Souss-Massa',
        serviceType: 'Base de CV / CVthèque pour recruteurs',
        description: 'Accès gratuit à une CVthèque régionale de candidats de la région Souss-Massa, recherchable par métier, ville, diplôme, compétence et expérience.',
        areaServed: { '@type': 'AdministrativeArea', name: 'Souss-Massa, Maroc' },
        provider: { '@type': 'Organization', name: 'SoussMassa-RH', url: SITE_URL },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'MAD' },
        url: `${SITE_URL}/cvtheque-gratuite`,
      },
      { '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })) },
    ],
  };

  return (
    <div>
      <SEO
        title="CVthèque gratuite à Agadir et Souss-Massa — base de CV recruteurs"
        description="Accédez gratuitement à la CVthèque régionale : des centaines de CV de candidats de la région Souss-Massa, recherchables par métier, ville, diplôme et expérience. Inscription entreprise gratuite, sans engagement."
        canonical="/cvtheque-gratuite"
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center">
          <p className="text-blue-200 font-semibold uppercase tracking-widest text-sm mb-3">Espace recruteurs · Souss-Massa</p>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-4">CVthèque gratuite à Souss-Massa</h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
            Accédez <strong>gratuitement</strong> à <strong>{count}+ CV</strong> de candidats de la région
            Souss-Massa (Agadir, Inezgane, Taroudant, Tiznit…), recherchables par métier, ville, diplôme,
            compétence et expérience.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/inscription-entreprise" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
              Accéder gratuitement à la CVthèque
            </Link>
            <Link to="/connexion-entreprise" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
              J’ai déjà un compte
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-8 text-blue-100 text-sm">
            <span><strong className="text-white">{count}+</strong> CV disponibles</span>
            <span><strong className="text-white">{villes}</strong> villes de la région</span>
            <span><strong className="text-white">0 MAD</strong> — 100 % gratuit</span>
          </div>
        </div>
      </section>

      {/* Intro SEO */}
      <section className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Une CVthèque gratuite pour recruter dans la région</h2>
        <p className="text-gray-600 leading-relaxed">
          Vous cherchez une <strong>CVthèque gratuite</strong> pour trouver des candidats à Agadir et dans toute la
          région Souss-Massa ? SoussMassa-RH met à disposition des entreprises une <strong>base de CV régionale</strong>,
          consultable gratuitement après inscription. Fini les abonnements coûteux aux grandes CVthèques nationales :
          ici, vous accédez directement à des profils <strong>locaux</strong>, à jour et motivés.
        </p>
      </section>

      {/* Bénéfices */}
      <section className="max-w-5xl mx-auto px-4 pb-4">
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
      <section className="bg-white border-y border-gray-100 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-10">Comment accéder gratuitement à la CVthèque ?</h2>
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

      {/* Lien vers dépôt d'offre */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 sm:p-10 text-center">
          <h2 className="text-xl font-black text-gray-900 mb-2">Vous préférez publier une offre ?</h2>
          <p className="text-gray-600 text-sm mb-5 max-w-2xl mx-auto">
            Vous pouvez aussi <Link to="/recruter" className="text-blue-600 font-semibold hover:underline">publier vos offres d’emploi gratuitement</Link>.
            CVthèque et dépôt d’offres sont inclus dans le même compte entreprise.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
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
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Accédez à la CVthèque régionale, gratuitement</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">Créez votre compte entreprise et trouvez dès aujourd’hui les profils dont vous avez besoin à Souss-Massa.</p>
          <Link to="/inscription-entreprise" className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
            Accéder gratuitement à la CVthèque
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CvthequeGratuite;
