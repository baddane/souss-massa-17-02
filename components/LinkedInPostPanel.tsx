import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { ObsArticle } from '../src/services/observatoireService';
import { buildLinkedInPost, lienPartageLinkedIn, LINKEDIN_MAX } from '../src/services/linkedinPost';

// Prepare la publication d'un article de l'Observatoire sur LinkedIn.
//
// Le texte est genere depuis l'article (titre, chapo, chiffres des diagrammes,
// lien, hashtags) puis reste MODIFIABLE : un extrait automatique est un point de
// depart, pas une publication.
//
// Deux boutons, parce que LinkedIn ne pre-remplit plus le texte depuis une URL
// de partage — seul le lien passe. On copie donc le texte, puis on ouvre la
// fenetre de publication ou il ne reste qu'a coller.

interface Props {
  article: ObsArticle;
  onClose: () => void;
}

const LinkedInPostPanel: React.FC<Props> = ({ article, onClose }) => {
  const [texte, setTexte] = useState('');
  const [copie, setCopie] = useState(false);

  useEffect(() => { setTexte(buildLinkedInPost(article)); }, [article]);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      toast.success('Texte copié');
    } catch {
      toast.info('Copie impossible : sélectionnez le texte et copiez-le à la main.');
    }
  };

  const ouvrirLinkedIn = () => {
    if (!copie) toast.info("Pensez à copier le texte d'abord : LinkedIn ne le pré-remplit pas.");
    window.open(lienPartageLinkedIn(article.slug), '_blank', 'noopener,width=720,height=680');
  };

  const trop = texte.length > LINKEDIN_MAX;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 p-6 space-y-4"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900">Publier sur LinkedIn</h2>
            <p className="text-sm text-gray-500 mt-1 truncate">{article.titre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <p className="text-sm text-blue-900 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          Un <strong>extrait</strong>, pas l'article entier : republier le texte intégral mettrait votre
          site en concurrence avec LinkedIn, dont l'autorité est bien supérieure — et c'est LinkedIn
          qui remonterait dans Google, pas soussmassa-rh.com.
        </p>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Texte de la publication</label>
            <span className={`text-xs ${trop ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
              {texte.length} / {LINKEDIN_MAX}
            </span>
          </div>
          <textarea
            value={texte}
            onChange={(e) => { setTexte(e.target.value); setCopie(false); }}
            rows={16}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm leading-relaxed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Les ~200 premiers caractères sont les seuls visibles avant « …voir plus ».
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={copier}
            className={`px-5 py-3 rounded-xl font-bold text-sm ${
              copie ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
          >
            {copie ? '✓ Texte copié' : '1. Copier le texte'}
          </button>
          <button
            onClick={ouvrirLinkedIn}
            className="px-5 py-3 rounded-xl font-bold text-sm bg-[#0A66C2] text-white hover:bg-[#004182]"
          >
            2. Ouvrir LinkedIn et coller
          </button>
          <button
            onClick={() => setTexte(buildLinkedInPost(article))}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Régénérer
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedInPostPanel;
