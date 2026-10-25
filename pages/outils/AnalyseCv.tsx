import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';

// Analyse de CV par règles (aucune IA) : complétude, verbes d'action, résultats
// chiffrés, sections, et correspondance aux mots-clés d'une offre cible.

const VERBES = ['gérer', 'géré', 'gere', 'diriger', 'dirigé', 'piloter', 'piloté', 'développer', 'développé', 'developpe',
  'créer', 'créé', 'cree', 'organiser', 'organisé', 'coordonner', 'coordonné', 'réaliser', 'réalisé', 'realise',
  'optimiser', 'optimisé', 'augmenter', 'augmenté', 'réduire', 'réduit', 'améliorer', 'amélioré', 'ameliore',
  'encadrer', 'encadré', 'former', 'formé', 'négocier', 'négocié', 'vendre', 'vendu', 'concevoir', 'conçu',
  'mettre en place', 'assurer', 'assuré', 'superviser', 'supervisé', 'planifier', 'planifié', 'analyser', 'analysé',
  'lancer', 'lancé', 'déployer', 'déployé', 'résoudre', 'résolu', 'accompagner', 'accompagné'];
const SECTIONS = [
  { key: ['expérience', 'experience', 'parcours', 'professionnel'], label: 'Expérience professionnelle' },
  { key: ['formation', 'diplôme', 'diplome', 'études', 'etudes', 'scolarité'], label: 'Formation' },
  { key: ['compétence', 'competence', 'skills', 'savoir-faire'], label: 'Compétences' },
  { key: ['langue', 'langues', 'arabe', 'français', 'francais', 'anglais'], label: 'Langues' },
];
const STOP = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en', 'à', 'au', 'aux', 'pour', 'par',
  'sur', 'dans', 'avec', 'sans', 'ou', 'où', 'ce', 'cette', 'ces', 'son', 'sa', 'ses', 'nos', 'vos', 'est', 'sont',
  'être', 'avoir', 'plus', 'the', 'and', 'for', 'nous', 'vous', 'qui', 'que', 'une', 'ans', 'poste', 'profil', 'emploi']);

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const tokens = (s: string) => norm(s).replace(/[^a-z0-9àâäéèêëïîôöùûüç\s]/gi, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));

interface Check { ok: boolean; pts: number; max: number; label: string; conseil: string; }

function analyser(cv: string, offre: string) {
  const checks: Check[] = [];
  const low = norm(cv);
  const words = cv.trim() ? cv.trim().split(/\s+/).length : 0;

  // 1. Longueur
  const okLen = words >= 180 && words <= 750;
  checks.push({ ok: okLen, pts: okLen ? 15 : (words > 80 ? 8 : 0), max: 15,
    label: `Longueur du CV (${words} mots)`,
    conseil: words < 180 ? 'Trop court : développez vos missions et résultats (visez 1 à 2 pages).' : words > 750 ? 'Trop long : resserrez sur l’essentiel (1 à 2 pages maximum).' : 'Bonne longueur.' });

  // 2. Coordonnées
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(cv);
  const hasTel = /(\+?212|0)\s*[5-7](\s*\d){8}/.test(cv.replace(/[.\-]/g, ' '));
  const okContact = hasEmail && hasTel;
  checks.push({ ok: okContact, pts: (hasEmail ? 5 : 0) + (hasTel ? 5 : 0), max: 10,
    label: 'Coordonnées (e-mail + téléphone)',
    conseil: okContact ? 'Coordonnées présentes.' : `Ajoutez ${!hasEmail ? 'un e-mail' : ''}${!hasEmail && !hasTel ? ' et ' : ''}${!hasTel ? 'un téléphone' : ''} en haut du CV.` });

  // 3. Sections clés
  const found = SECTIONS.filter((s) => s.key.some((k) => low.includes(norm(k))));
  const okSec = found.length >= 3;
  checks.push({ ok: okSec, pts: Math.round((found.length / SECTIONS.length) * 15), max: 15,
    label: `Sections essentielles (${found.length}/4)`,
    conseil: okSec ? 'Structure claire.' : `Ajoutez les sections manquantes : ${SECTIONS.filter((s) => !found.includes(s)).map((s) => s.label).join(', ')}.` });

  // 4. Verbes d'action
  const nbVerbes = VERBES.filter((v) => low.includes(norm(v))).length;
  const okVerbes = nbVerbes >= 5;
  checks.push({ ok: okVerbes, pts: Math.min(20, nbVerbes * 3), max: 20,
    label: `Verbes d’action (${nbVerbes} détectés)`,
    conseil: okVerbes ? 'Vos expériences sont décrites avec des verbes d’action.' : 'Commencez vos phrases par des verbes d’action (géré, développé, optimisé…) plutôt que « responsable de ».' });

  // 5. Résultats chiffrés
  const chiffres = (cv.match(/\d+\s*(%|dh|mad|k|personnes|clients|projets|%|€)/gi) || []).length
    + (cv.match(/\b\d{2,}\b/g) || []).length;
  const okChiffres = chiffres >= 3;
  checks.push({ ok: okChiffres, pts: Math.min(20, chiffres * 4), max: 20,
    label: `Résultats chiffrés (${chiffres})`,
    conseil: okChiffres ? 'Vos réalisations sont quantifiées — excellent.' : 'Quantifiez vos résultats : « +20 % de ventes », « équipe de 8 », « budget de 500 000 DH ».' });

  // 6. Correspondance à l'offre
  let matchPts = 0, matchMax = 20, matchLabel = 'Correspondance à l’offre (optionnel)', matchConseil = 'Collez une offre ciblée pour mesurer l’adéquation de votre CV.';
  let manquants: string[] = [];
  if (offre.trim()) {
    const kw = Array.from(new Set(tokens(offre)));
    const top = kw.slice(0, 40);
    const present = top.filter((w) => low.includes(w));
    const ratio = top.length ? present.length / top.length : 0;
    matchPts = Math.round(ratio * 20);
    manquants = top.filter((w) => !low.includes(w)).slice(0, 12);
    matchLabel = `Correspondance à l’offre (${Math.round(ratio * 100)} %)`;
    matchConseil = ratio >= 0.6 ? 'Bon alignement avec l’offre.' : 'Intégrez (honnêtement) les mots-clés de l’offre encore absents, ci-dessous.';
  }
  checks.push({ ok: offre.trim() ? matchPts >= 12 : true, pts: offre.trim() ? matchPts : matchMax, max: matchMax, label: matchLabel, conseil: matchConseil });

  const total = checks.reduce((s, c) => s + c.pts, 0);
  const max = checks.reduce((s, c) => s + c.max, 0);
  const score = Math.round((total / max) * 100);
  return { score, checks, manquants };
}

const AnalyseCv: React.FC = () => {
  const [cv, setCv] = useState('');
  const [offre, setOffre] = useState('');
  const [run, setRun] = useState(false);
  const res = useMemo(() => (run ? analyser(cv, offre) : null), [run, cv, offre]);

  const couleur = (s: number) => (s >= 75 ? 'text-green-600' : s >= 50 ? 'text-amber-500' : 'text-red-500');
  const barre = (s: number) => (s >= 75 ? 'bg-green-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SEO
        title="Analyse de CV gratuite : score et conseils (sans IA)"
        description="Analysez gratuitement votre CV : score de qualité, verbes d’action, résultats chiffrés, complétude et correspondance avec une offre d’emploi. Conseils concrets, 100 % privé."
        canonical="/outils/analyse-cv"
      />
      <nav className="text-sm text-gray-400 mb-4">
        <Link to="/outils" className="hover:text-blue-600">Outils</Link><span className="mx-2">/</span><span>Analyse de CV</span>
      </nav>

      <h1 className="text-3xl font-black text-gray-900 mb-2">Analyse de CV</h1>
      <p className="text-gray-600 mb-6">Collez le texte de votre CV pour obtenir un <strong>score</strong> et des <strong>conseils concrets</strong>. Ajoutez une offre pour mesurer l’adéquation.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <label className="block text-sm font-semibold text-gray-600">Votre CV (copier-coller le texte)
          <textarea rows={12} value={cv} onChange={(e) => { setCv(e.target.value); setRun(false); }}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Collez ici l’intégralité du texte de votre CV…" />
        </label>
        <label className="block text-sm font-semibold text-gray-600">Offre d’emploi ciblée (optionnel)
          <textarea rows={12} value={offre} onChange={(e) => { setOffre(e.target.value); setRun(false); }}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Collez le texte de l’offre pour comparer les mots-clés…" />
        </label>
      </div>

      <button onClick={() => setRun(true)} disabled={cv.trim().length < 50}
        className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
        Analyser mon CV
      </button>
      {cv.trim().length < 50 && <span className="ml-3 text-sm text-gray-400">Collez au moins quelques lignes.</span>}

      {res && (
        <div className="mt-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-6">
            <div className="text-center">
              <div className={`text-5xl font-black ${couleur(res.score)}`}>{res.score}</div>
              <div className="text-xs text-gray-400 font-semibold">/ 100</div>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${barre(res.score)}`} style={{ width: `${res.score}%` }} /></div>
              <p className="text-sm text-gray-600 mt-2">
                {res.score >= 75 ? 'Très bon CV — quelques ajustements et il est prêt.' : res.score >= 50 ? 'CV correct : les conseils ci-dessous le feront passer un cap.' : 'CV à retravailler : suivez les conseils prioritaires ci-dessous.'}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {res.checks.map((c, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                <span className={`mt-0.5 text-lg ${c.ok ? 'text-green-500' : 'text-amber-500'}`}>{c.ok ? '✓' : '!'}</span>
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-bold text-gray-900 text-sm">{c.label}</p>
                    <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">{c.pts}/{c.max} pts</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{c.conseil}</p>
                </div>
              </div>
            ))}
          </div>

          {res.manquants.length > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-bold text-gray-900 text-sm mb-2">Mots-clés de l’offre absents de votre CV</p>
              <div className="flex flex-wrap gap-2">
                {res.manquants.map((m) => <span key={m} className="bg-white border border-amber-200 text-amber-800 px-2 py-1 rounded-full text-xs">{m}</span>)}
              </div>
              <p className="text-xs text-gray-500 mt-2">N’ajoutez que ce qui est vrai pour vous : l’objectif est de parler le même langage que l’offre.</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/outils/cv" className="inline-block bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800">Améliorer mon CV avec le générateur →</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyseCv;
