import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import { useLocalStorage } from '../../src/hooks/useLocalStorage';

// Lettre de motivation : cadre guidé (accroche / vous / moi / nous), bibliothèque
// de formulations à insérer, aperçu A4 imprimable. 100 % client, sans IA.

interface L {
  nom: string; ville: string; email: string; tel: string;
  entreprise: string; poste: string; villeEnt: string;
  objet: string; accroche: string; vous: string; moi: string; nous: string; formule: string;
}
const EMPTY: L = {
  nom: '', ville: '', email: '', tel: '',
  entreprise: '', poste: '', villeEnt: '',
  objet: '', accroche: '', vous: '', moi: '', nous: '',
  formule: 'Dans l’attente de votre retour, je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
};

const BIB = {
  accroche: [
    'Actuellement à la recherche d’un nouveau défi professionnel, votre offre de {poste} a immédiatement retenu mon attention.',
    'Vivement intéressé(e) par le poste de {poste} au sein de {entreprise}, je vous soumets ma candidature.',
    'Votre annonce pour le poste de {poste} correspond précisément au projet professionnel que je souhaite construire.',
  ],
  vous: [
    'Reconnue pour son savoir-faire dans la région Souss-Massa, {entreprise} incarne les valeurs d’exigence et de proximité auxquelles je suis attaché(e).',
    'Le dynamisme de {entreprise} et sa réputation sur son marché sont pour moi une véritable source de motivation.',
  ],
  moi: [
    'Fort(e) de mon expérience, j’ai développé des compétences solides en … qui répondent directement aux missions du poste.',
    'Mon parcours m’a permis d’acquérir rigueur, autonomie et sens du résultat, des qualités que je mettrai au service de vos équipes.',
  ],
  nous: [
    'Rejoindre {entreprise}, c’est pour moi l’opportunité de contribuer activement à vos objectifs tout en continuant à progresser.',
    'Je suis convaincu(e) que mon profil et vos besoins se rencontrent, et je serais ravi(e) d’en discuter lors d’un entretien.',
  ],
};

const field = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none';
const label = 'block text-xs font-semibold text-gray-500';

const LettreMotivation: React.FC = () => {
  const [l, setL, reset] = useLocalStorage<L>('ssm_lm_v1', EMPTY);
  const set = (p: Partial<L>) => setL((c) => ({ ...c, ...p }));
  const fill = (s: string) => s.replace(/\{poste\}/g, l.poste || '…').replace(/\{entreprise\}/g, l.entreprise || '…');
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const objet = l.objet || (l.poste ? `Candidature au poste de ${l.poste}` : 'Candidature');

  const insert = (champ: keyof L, texte: string) => set({ [champ]: ((l[champ] as string) ? l[champ] + ' ' : '') + fill(texte) } as Partial<L>);
  const Suggest: React.FC<{ champ: keyof L; options: string[] }> = ({ champ, options }) => (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {options.map((o, i) => (
        <button key={i} onClick={() => insert(champ, o)} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 text-start">
          + {fill(o).slice(0, 48)}…
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SEO
        title="Lettre de motivation : modèle gratuit et guide (PDF)"
        description="Rédigez une lettre de motivation efficace grâce à un cadre guidé (accroche, vous-moi-nous) et des exemples de formulations. Aperçu et export PDF, gratuit et sans inscription."
        canonical="/outils/lettre-motivation"
      />
      <style>{`@media print { body * { visibility: hidden !important; } #lm-sheet, #lm-sheet * { visibility: visible !important; } #lm-sheet { position:absolute; left:0; top:0; width:210mm !important; min-height:297mm; box-shadow:none !important; } @page { size:A4; margin:0; } }`}</style>

      <nav className="text-sm text-gray-400 mb-4">
        <Link to="/outils" className="hover:text-blue-600">Outils</Link><span className="mx-2">/</span><span>Lettre de motivation</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-1/2 space-y-4 print:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-gray-900">Lettre de motivation</h1>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">⬇ PDF</button>
              <button onClick={() => { if (confirm('Effacer la lettre ?')) reset(); }} className="px-3 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">Réinit.</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-3">
            <h2 className="font-bold text-gray-900 text-sm col-span-2">Vous</h2>
            <label className={label}>Nom complet<input className={field} value={l.nom} onChange={(e) => set({ nom: e.target.value })} /></label>
            <label className={label}>Ville<input className={field} value={l.ville} onChange={(e) => set({ ville: e.target.value })} /></label>
            <label className={label}>E-mail<input className={field} value={l.email} onChange={(e) => set({ email: e.target.value })} /></label>
            <label className={label}>Téléphone<input className={field} value={l.tel} onChange={(e) => set({ tel: e.target.value })} /></label>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-3">
            <h2 className="font-bold text-gray-900 text-sm col-span-2">Destinataire</h2>
            <label className={label}>Entreprise<input className={field} value={l.entreprise} onChange={(e) => set({ entreprise: e.target.value })} /></label>
            <label className={label}>Ville<input className={field} value={l.villeEnt} onChange={(e) => set({ villeEnt: e.target.value })} /></label>
            <label className={`${label} col-span-2`}>Poste visé<input className={field} value={l.poste} onChange={(e) => set({ poste: e.target.value })} /></label>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">Corps de la lettre</h2>
            <div><label className={label}>Accroche — pourquoi ce poste</label>
              <textarea rows={2} className={field} value={l.accroche} onChange={(e) => set({ accroche: e.target.value })} /><Suggest champ="accroche" options={BIB.accroche} /></div>
            <div><label className={label}>« Vous » — ce qui vous attire dans l’entreprise</label>
              <textarea rows={2} className={field} value={l.vous} onChange={(e) => set({ vous: e.target.value })} /><Suggest champ="vous" options={BIB.vous} /></div>
            <div><label className={label}>« Moi » — ce que vous apportez</label>
              <textarea rows={2} className={field} value={l.moi} onChange={(e) => set({ moi: e.target.value })} /><Suggest champ="moi" options={BIB.moi} /></div>
            <div><label className={label}>« Nous » — la collaboration et l’entretien</label>
              <textarea rows={2} className={field} value={l.nous} onChange={(e) => set({ nous: e.target.value })} /><Suggest champ="nous" options={BIB.nous} /></div>
          </div>
        </div>

        {/* Aperçu A4 */}
        <div className="w-full lg:w-1/2 lg:sticky lg:top-20 overflow-x-auto">
          <div className="hidden lg:block text-xs text-gray-400 mb-2">Aperçu — format A4</div>
          <div id="lm-sheet" className="bg-white shadow-lg mx-auto p-12 text-[13px] leading-relaxed text-gray-800" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="mb-8">
              <p className="font-bold">{l.nom || 'Votre Nom'}</p>
              <p>{l.ville}</p><p>{l.email}</p><p>{l.tel}</p>
            </div>
            <div className="text-end mb-8">
              <p className="font-semibold">{l.entreprise || 'Entreprise'}</p>
              <p>{l.villeEnt}</p>
              <p className="mt-2">{(l.ville || 'Agadir')}, le {today}</p>
            </div>
            <p className="font-bold mb-4">Objet : {objet}</p>
            <p className="mb-3">Madame, Monsieur,</p>
            {[l.accroche, l.vous, l.moi, l.nous].filter(Boolean).map((p, i) => <p key={i} className="mb-3 text-justify">{p}</p>)}
            {![l.accroche, l.vous, l.moi, l.nous].some(Boolean) && <p className="mb-3 text-gray-300 italic">Le corps de votre lettre apparaîtra ici au fur et à mesure…</p>}
            <p className="mb-6 text-justify">{l.formule}</p>
            <p className="text-end font-semibold">{l.nom || 'Votre Nom'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LettreMotivation;
