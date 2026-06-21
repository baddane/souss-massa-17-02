import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const NotFound: React.FC = () => {
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Page introuvable | SoussMassa-RH</title>
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-6xl font-extrabold text-gray-200 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Page introuvable</h2>
        <p className="text-gray-500 mb-8">
          La page que vous cherchez n'existe pas ou a ete deplacee.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Retour a l'accueil
          </Link>
          <Link
            to="/offres"
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Voir les offres
          </Link>
        </div>
      </div>
    </>
  );
};

export default NotFound;
