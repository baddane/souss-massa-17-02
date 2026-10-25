import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import { useLocalStorage } from '../../src/hooks/useLocalStorage';

// Projet professionnel : test d'intérêts RIASEC (sans IA, barème transparent),
// bilan d'atouts, objectif SMART et plan d'action — fiche imprimable.

type Dim = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
const DIMS: Record<Dim, { nom: string; emoji: string; metiers: string }> = {
  R: { nom: 'Réaliste (concret, technique)', emoji: '🔧', metiers: 'Industrie, BTP, maintenance, mécanique, agriculture, logistique, électricité.' },
  I: { nom: 'Investigateur (analyse, recherche)', emoji: '🔬', metiers: 'Informatique & data, laboratoire, qualité, études, santé, ingénierie.' },
  A: { nom: 'Artistique (création, expression)', emoji: '🎨', metiers: 'Design, communication, marketing créatif, audiovisuel, architecture, artisanat d’art.' },
  S: { nom: 'Social (aide, relation)', emoji: '🤝', metiers: 'Enseignement & formation, santé & aide à la personne, RH, tourisme & accueil, relation client.' },
  E: { nom: 'Entreprenant (influence, gestion)', emoji: '📈', metiers: 'Commerce & vente, management, entrepreneuriat, immobilier, négoce, événementiel.' },
  C: { nom: 'Conventionnel (organisation, rigueur)', emoji: '📊', metiers: 'Comptabilité & finance, administration, banque & assurance, secrétariat, gestion, supply chain.' },
};

const QUESTIONS: { t: string; d: Dim }[] = [
  { t: 'Réparer ou monter un objet / une machine', d: 'R' },
  { t: 'Travailler en extérieur ou sur le terrain', d: 'R' },
  { t: 'Utiliser des outils, des engins ou des équipements', d: 'R' },
  { t: 'Comprendre comment les choses fonctionnent, enquêter', d: 'I' },
  { t: 'Résoudre des problèmes complexes avec des chiffres ou des données', d: 'I' },
  { t: 'Faire des expériences, analyser, tester des hypothèses', d: 'I' },
  { t: 'Dessiner, créer, imaginer des choses nouvelles', d: 'A' },
  { t: 'M’exprimer (écriture, image, musique, mise en forme)', d: 'A' },
  { t: 'Travailler sans cadre trop rigide, avec de la liberté', d: 'A' },
  { t: 'Aider, conseiller ou former d’autres personnes', d: 'S' },
  { t: 'Travailler en équipe et au contact du public', d: 'S' },
  { t: 'Écouter et résoudre les problèmes des gens', d: 'S' },
  { t: 'Convaincre, vendre, défendre une idée', d: 'E' },
  { t: 'Diriger un projet ou une équipe, prendre des décisions', d: 'E' },
  { t: 'Lancer une activité, prendre des initiatives', d: 'E' },
  { t: 'Organiser, classer, suivre des dossiers avec rigueur', d: 'C' },
  { t: 'Travailler avec des procédures claires et des chiffres', d: 'C' },
  { t: 'Gérer un budget, une comptabilité, un planning', d: 'C' },
];

interface State { rep: Record<number, number>; atouts: string; contraintes: string; smart: string; metiers: string; action1: string; action2: string; action3: string; }
const EMPTY: State = { rep: {}, atouts: '', contraintes: '', smart: '', metiers: '', action1: '', action2: '', action3: '' };
const field = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none';
const NIVEAUX = ['Pas vraiment', 'Un peu', 'Beaucoup'];

const ProjetProfessionnel: React.FC = () => {
  const [s, setS, reset] = useLocalStorage<State>('ssm_projet_v1', EMPTY);
  const set = (p: Partial<State>) => setS((c) => ({ ...c, ...p }));
  const answered = Object.keys(s.rep).length;

  const scores = useMemo(() => {
    const sc: Record<Dim, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    QUESTIONS.forEach((q, i) => { sc[q.d] += s.rep[i] || 0; });
    return sc;
  }, [s.rep]);
  const maxScore = 6; // 3 questions × 2 pts
  const classement = (Object.keys(scores) as Dim[]).sort((a, b) => scores[b] - scores[a]);
  const top = answered >= 12 ? classement.slice(0, 3) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SEO
        title="Projet professionnel : test d’orientation (RIASEC) et plan d’action"
        description="Construisez votre projet professionnel : test d’intérêts RIASEC, bilan de vos atouts, objectif SMART et plan d’action. Gratuit, sans inscription, résultats imprimables."
        canonical="/outils/projet-professionnel"
      />
      <style>{`@media print { body * { visibility:hidden !important; } #fiche, #fiche * { visibility:visible !important; } #fiche { position:absolute; left:0; top:0; width:100%; } .no-print{display:none !important;} @page{ size:A4; margin:14mm; } }`}</style>

      <nav className="text-sm text-gray-400 mb-4 no-print">
        <Link to="/outils" className="hover:text-blue-600">Outils</Link><span className="mx-2">/</span><span>Projet professionnel</span>
      </nav>

      <div className="flex items-center justify-between mb-2 no-print">
        <h1 className="text-3xl font-black text-gray-900">Projet professionnel</h1>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">⬇ Fiche PDF</button>
          <button onClick={() => { if (confirm('Tout effacer ?')) reset(); }} className="px-3 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">Réinit.</button>
        </div>
      </div>
      <p className="text-gray-600 mb-6 no-print">Trois étapes : découvrez vos <strong>intérêts dominants</strong>, faites votre <strong>bilan</strong>, fixez un <strong>objectif</strong> et un <strong>plan d’action</strong>.</p>

      {/* 1. Test RIASEC */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 no-print">
        <h2 className="font-black text-gray-900 mb-1">1. Test d’intérêts <span className="text-gray-400 font-normal text-sm">({answered}/{QUESTIONS.length})</span></h2>
        <p className="text-sm text-gray-500 mb-4">Pour chaque activité, indiquez à quel point elle vous plairait.</p>
        <div className="space-y-2">
          {QUESTIONS.map((q, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between border-b border-gray-50 pb-2">
              <span className="text-sm text-gray-700">{q.t}</span>
              <div className="flex gap-1 flex-shrink-0">
                {NIVEAUX.map((n, v) => (
                  <button key={v} onClick={() => set({ rep: { ...s.rep, [i]: v } })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${ (s.rep[i] ?? -1) === v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {answered < 12 && <p className="text-xs text-amber-600 mt-3">Répondez à au moins 12 activités pour voir votre profil.</p>}
      </section>

      {/* Résultat + bilan : aussi dans la fiche imprimable */}
      <div id="fiche">
        <div className="print:block hidden mb-4">
          <h1 className="text-2xl font-black">Ma fiche projet professionnel</h1>
        </div>

        {top.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="font-black text-gray-900 mb-3">Votre profil dominant</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {top.map((d, i) => (
                <span key={d} className={`px-3 py-1.5 rounded-full text-sm font-bold ${i === 0 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}>
                  {DIMS[d].emoji} {DIMS[d].nom.split(' (')[0]}
                </span>
              ))}
            </div>
            {/* barres */}
            <div className="space-y-1.5 mb-4">
              {classement.map((d) => (
                <div key={d} className="flex items-center gap-2 text-xs">
                  <span className="w-28 text-gray-500">{DIMS[d].emoji} {DIMS[d].nom.split(' (')[0]}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(scores[d] / maxScore) * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-700">
              <p className="font-bold text-gray-900 mb-1">Pistes de métiers correspondant à votre profil</p>
              <ul className="list-disc ml-5 space-y-1">
                {top.map((d) => <li key={d}><strong>{DIMS[d].nom.split(' (')[0]}</strong> — {DIMS[d].metiers}</li>)}
              </ul>
              <Link to="/offres" className="inline-block mt-2 text-blue-600 font-semibold no-print">Voir les offres correspondantes →</Link>
            </div>
          </section>
        )}

        {/* 2. Bilan + 3. SMART */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-black text-gray-900">2. Mon bilan &amp; mon objectif</h2>
          <label className="block text-xs font-semibold text-gray-500">Mes atouts (compétences, qualités, expériences)
            <textarea rows={2} className={field} value={s.atouts} onChange={(e) => set({ atouts: e.target.value })} /></label>
          <label className="block text-xs font-semibold text-gray-500">Mes contraintes (mobilité, disponibilité, à développer)
            <textarea rows={2} className={field} value={s.contraintes} onChange={(e) => set({ contraintes: e.target.value })} /></label>
          <label className="block text-xs font-semibold text-gray-500">Métiers / secteurs cibles
            <input className={field} value={s.metiers} onChange={(e) => set({ metiers: e.target.value })} /></label>
          <label className="block text-xs font-semibold text-gray-500">Mon objectif SMART (Spécifique, Mesurable, Atteignable, Réaliste, Temporel)
            <textarea rows={2} className={field} placeholder="Ex : Décrocher un poste de technicien de maintenance à Agadir d’ici 3 mois." value={s.smart} onChange={(e) => set({ smart: e.target.value })} /></label>
        </section>

        {/* 4. Plan d'action */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-black text-gray-900 mb-3">3. Mon plan d’action</h2>
          <div className="space-y-2">
            {([['action1', 'Étape 1 (cette semaine)'], ['action2', 'Étape 2 (ce mois-ci)'], ['action3', 'Étape 3 (3 mois)']] as [keyof State, string][]).map(([k, lbl]) => (
              <label key={k} className="block text-xs font-semibold text-gray-500">{lbl}
                <input className={field} value={s[k] as string} onChange={(e) => set({ [k]: e.target.value } as Partial<State>)} /></label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProjetProfessionnel;
