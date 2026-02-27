
import React from 'react';
import { Link } from 'react-router-dom';

const SOCIAL_LINKS: { platform: string; label: string; href: string }[] = [
  { platform: 'facebook', label: 'Facebook', href: 'https://facebook.com' },
  { platform: 'twitter', label: 'Twitter / X', href: 'https://twitter.com' },
  { platform: 'linkedin', label: 'LinkedIn', href: 'https://linkedin.com' },
  { platform: 'instagram', label: 'Instagram', href: 'https://instagram.com' },
];

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

        {/* Branding */}
        <div className="space-y-6">
          <Link to="/" aria-label="SoussMassa-RH — Retour à l'accueil" className="flex items-center space-x-1">
            <span className="text-2xl font-bold text-white">SoussMassa</span>
            <span className="text-2xl font-light text-blue-400">-RH</span>
          </Link>
          <p className="text-sm leading-relaxed text-gray-400">
            SoussMassa-RH est le portail de référence pour l'emploi et le recrutement dans la région Souss-Massa, dédié aux talents locaux et aux entreprises dynamiques.
          </p>
          <nav aria-label="Réseaux sociaux">
            <ul className="flex space-x-4" role="list">
              {SOCIAL_LINKS.map(({ platform, label, href }) => (
                <li key={platform}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                  >
                    {/* Icône SVG inline — plus fiable que maskImage */}
                    {platform === 'facebook' && (
                      <svg className="w-5 h-5 fill-gray-300" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    )}
                    {platform === 'twitter' && (
                      <svg className="w-5 h-5 fill-gray-300" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    )}
                    {platform === 'linkedin' && (
                      <svg className="w-5 h-5 fill-gray-300" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zm2-3a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>
                    )}
                    {platform === 'instagram' && (
                      <svg className="w-5 h-5 fill-gray-300" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" className="fill-gray-900"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" className="stroke-gray-900 stroke-2"/></svg>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Talents */}
        <div className="space-y-6">
          <h2 className="text-white font-bold uppercase text-sm tracking-wider">Talents</h2>
          <ul className="space-y-3 text-sm" role="list">
            <li><Link to="/offres" className="hover:text-white transition-colors">Toutes les offres</Link></li>
            <li><Link to="/offres?city=Agadir" className="hover:text-white transition-colors">Emploi à Agadir</Link></li>
            <li><Link to="/offres?type=Stage" className="hover:text-white transition-colors">Trouver un stage</Link></li>
            <li><Link to="/conseils" className="hover:text-white transition-colors">Conseils Carrière</Link></li>
          </ul>
        </div>

        {/* Entreprises */}
        <div className="space-y-6">
          <h2 className="text-white font-bold uppercase text-sm tracking-wider">Entreprises</h2>
          <ul className="space-y-3 text-sm" role="list">
            <li><Link to="/inscription" className="hover:text-white transition-colors">Publier une offre</Link></li>
            <li><Link to="/nos-tarifs" className="hover:text-white transition-colors">Solutions de recrutement</Link></li>
            <li><Link to="/ecoles" className="hover:text-white transition-colors">Partenariats Écoles</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="space-y-6">
          <h2 className="text-white font-bold uppercase text-sm tracking-wider">Newsletter</h2>
          <p className="text-sm text-gray-400">Restez informé des meilleures opportunités dans le Souss-Massa.</p>
          <form
            className="flex"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Inscription à la newsletter"
          >
            <label htmlFor="footer-newsletter-email" className="sr-only">
              Votre adresse email
            </label>
            <input
              id="footer-newsletter-email"
              type="email"
              placeholder="votre@email.com"
              autoComplete="email"
              className="bg-gray-800 border border-gray-700 rounded-l-md px-4 py-2 w-full text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors whitespace-nowrap text-sm font-medium"
            >
              S'abonner
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-gray-800 text-center text-xs text-gray-400 space-y-4">
        <p>© {new Date().getFullYear()} soussmassa-rh.com. Tous droits réservés.</p>
        <nav aria-label="Liens légaux">
          <ul className="flex justify-center space-x-6" role="list">
            <li><Link to="/mentions-legales" className="hover:text-gray-200 transition-colors">Mentions légales</Link></li>
            <li><Link to="/cookies" className="hover:text-gray-200 transition-colors">Gestion des cookies</Link></li>
            <li><Link to="/contact" className="hover:text-gray-200 transition-colors">Contactez-nous</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
