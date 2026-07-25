import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const SITE_URL = 'https://soussmassa-rh.com';

const BENEFITS = [
  { icon: '🎯', titre: 'Une audience 100 % régionale', texte: "Votre offre est vue par des candidats d'Agadir, Inezgane, Taroudant, Tiznit et toute la région Souss-Massa — pas par un trafic national dilué." },
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

const FAQ = [
  { q: 'Publier une offre d’emploi est-il gratuit ?', r: 'Oui, vous pouvez créer un compte entreprise et publier vos premières offres gratuitement sur SoussMassa-RH.' },
  { q: 'Comment déposer une offre d’emploi à Agadir ou en Souss-Massa ?', r: 'Créez un compte entreprise, puis remplissez le formulaire de dépôt d’offre (intitulé, ville, type de contrat, description). Votre annonce est mise en ligne après une rapide vérification.' },
  { q: 'Quels types de contrats puis-je proposer ?', r: 'CDI, CDD, stage, intérim, alternance ou freelance : tous les types de contrats sont acceptés.' },
  { q: 'Comment recevoir et gérer les candidatures ?', r: 'Les candidats postulent directement en ligne. Vous consultez les candidatures et les CV depuis votre espace entreprise.' },
  { q: 'Puis-je consulter des CV sans publier d’offre ?', r: 'Oui, la CVthèque vous permet de rechercher des profils de la région par métier, ville, diplôme, compétence ou années d’expérience.' },
];

const Recruter: React.FC = () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'Publication d’offres d’emploi et recrutement en Souss-Massa',
        serviceType: 'Recrutement en ligne',
        provider: { '@type': 'Organization', name: 'SoussMassa-RH', url: SITE_URL },
        areaServed: { '@type': 'AdministrativeArea', name: 'Souss-Massa, Maroc' },
        url: `${SITE_URL}/recruter`,
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.r },
        })),
      },
    ],
  };

  return (
    <div>
      <SEO
        title="Recruter en Souss-Massa : publiez votre offre d’emploi"
        description="Recrutez à Agadir et en Souss-Massa : publiez vos offres d’emploi, accédez à la CVthèque et à une audience régionale ciblée. Dépôt simple, gratuit pour démarrer."
        canonical="/recruter"
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center">
          <p className="text-blue-200 font-semibold uppercase tracking-widest text-sm mb-3">Espace recruteurs</p>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-4">
            Recrutez les meilleurs talents de la Souss-Massa
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
            Publiez vos offres d’emploi, accédez à la CVthèque régionale et touchez une audience
            ciblée à Agadir, Inezgane, Taroudant, Tiznit et dans toute la région.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/inscription-entreprise" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
              Déposer une offre gratuitement
            </Link>
            <Link to="/connexion-entreprise" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-3.5 rounded-xl font-bold transition-colors">
              J’ai déjà un compte
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-10 text-blue-100 text-sm">
            <span><strong className="text-white">1 700+</strong> postes publiés</span>
            <span><strong className="text-white">160+</strong> entreprises</span>
            <span><strong className="text-white">7 villes</strong> couvertes</span>
          </div>
        </div>
      </section>

      {/* Bénéfices */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 text-center mb-3">Pourquoi recruter avec SoussMassa-RH ?</h2>
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
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Prêt à recruter en Souss-Massa ?</h2>
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
