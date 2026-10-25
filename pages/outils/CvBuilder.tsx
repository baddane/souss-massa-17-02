import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import { useLocalStorage } from '../../src/hooks/useLocalStorage';

// Générateur de CV 100 % client (aucune donnée envoyée au serveur), sans IA.
// Aperçu A4 en direct + export PDF via l'impression du navigateur.

interface Exp { poste: string; entreprise: string; ville: string; debut: string; fin: string; desc: string; }
interface Edu { diplome: string; etablissement: string; ville: string; annee: string; }
interface CvData {
  prenom: string; nom: string; titre: string; email: string; tel: string; ville: string;
  linkedin: string; permis: string; photo: string; accroche: string;
  experiences: Exp[]; formations: Edu[]; competences: string; langues: string; interets: string;
  modele: 'moderne' | 'classique'; accent: string;
}

const EMPTY: CvData = {
  prenom: '', nom: '', titre: '', email: '', tel: '', ville: '', linkedin: '', permis: '', photo: '', accroche: '',
  experiences: [{ poste: '', entreprise: '', ville: '', debut: '', fin: '', desc: '' }],
  formations: [{ diplome: '', etablissement: '', ville: '', annee: '' }],
  competences: '', langues: '', interets: '', modele: 'moderne', accent: '#1d4ed8',
};

const ACCENTS = ['#1d4ed8', '#0f766e', '#b45309', '#9333ea', '#be123c', '#111827'];
const field = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none';
const label = 'block text-xs font-semibold text-gray-500';
const splitLines = (s: string) => s.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);

const CvBuilder: React.FC = () => {
  const [cv, setCv, reset] = useLocalStorage<CvData>('ssm_cv_v1', EMPTY);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<CvData>) => setCv((c) => ({ ...c, ...patch }));

  const onPhoto = (file?: File) => {
    if (!file) return;
    if (file.size > 2_000_000) { alert('Image trop lourde (max 2 Mo).'); return; }
    const r = new FileReader();
    r.onload = () => set({ photo: String(r.result) });
    r.readAsDataURL(file);
  };

  const setExp = (i: number, p: Partial<Exp>) =>
    setCv((c) => ({ ...c, experiences: c.experiences.map((e, j) => (j === i ? { ...e, ...p } : e)) }));
  const setEdu = (i: number, p: Partial<Edu>) =>
    setCv((c) => ({ ...c, formations: c.formations.map((e, j) => (j === i ? { ...e, ...p } : e)) }));

  const a = cv.accent;
  const competences = splitLines(cv.competences);
  const langues = splitLines(cv.langues);
  const interets = splitLines(cv.interets);
  const fullName = `${cv.prenom} ${cv.nom}`.trim() || 'Votre Nom';
  const periode = (d: string, f: string) => [d, f].filter(Boolean).join(' – ');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SEO
        title="Générateur de CV gratuit en ligne (PDF) — modèles professionnels"
        description="Créez gratuitement un CV professionnel en ligne et exportez-le en PDF. Plusieurs modèles, aperçu en direct, sans inscription. Vos données restent privées (aucune IA, aucun envoi)."
        canonical="/outils/cv"
      />

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cv-sheet, #cv-sheet * { visibility: visible !important; }
          #cv-sheet { position: absolute; left: 0; top: 0; margin: 0 !important; box-shadow: none !important; width: 210mm !important; min-height: 297mm; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <nav className="text-sm text-gray-400 mb-4">
        <Link to="/outils" className="hover:text-blue-600">Outils</Link>
        <span className="mx-2">/</span><span>Générateur de CV</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ---------------- Formulaire ---------------- */}
        <div className="w-full lg:w-1/2 space-y-5 print:hidden">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-black text-gray-900">Générateur de CV</h1>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">⬇ Télécharger (PDF)</button>
              <button onClick={() => { if (confirm('Effacer tout le CV ?')) reset(); }} className="px-3 py-2 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">Réinitialiser</button>
            </div>
          </div>
          <p className="text-xs text-gray-400">💾 Enregistré automatiquement dans ce navigateur · 🔒 aucune donnée envoyée.</p>

          {/* Style */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-bold text-gray-900 text-sm mb-3">Style</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2">
                {(['moderne', 'classique'] as const).map((m) => (
                  <button key={m} onClick={() => set({ modele: m })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${cv.modele === m ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600'}`}>
                    {m === 'moderne' ? 'Moderne' : 'Classique (ATS)'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Couleur :</span>
                {ACCENTS.map((c) => (
                  <button key={c} onClick={() => set({ accent: c })} aria-label={`couleur ${c}`}
                    className={`w-6 h-6 rounded-full border-2 ${a === c ? 'border-gray-800' : 'border-white'} shadow`} style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>

          {/* Identité */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <h2 className="font-bold text-gray-900 text-sm sm:col-span-2">Informations personnelles</h2>
            <label className={label}>Prénom<input className={field} value={cv.prenom} onChange={(e) => set({ prenom: e.target.value })} /></label>
            <label className={label}>Nom<input className={field} value={cv.nom} onChange={(e) => set({ nom: e.target.value })} /></label>
            <label className={`${label} sm:col-span-2`}>Titre / poste visé<input className={field} placeholder="Ex : Technicien de maintenance industrielle" value={cv.titre} onChange={(e) => set({ titre: e.target.value })} /></label>
            <label className={label}>E-mail<input className={field} value={cv.email} onChange={(e) => set({ email: e.target.value })} /></label>
            <label className={label}>Téléphone<input className={field} value={cv.tel} onChange={(e) => set({ tel: e.target.value })} /></label>
            <label className={label}>Ville<input className={field} placeholder="Agadir" value={cv.ville} onChange={(e) => set({ ville: e.target.value })} /></label>
            <label className={label}>LinkedIn / site (optionnel)<input className={field} value={cv.linkedin} onChange={(e) => set({ linkedin: e.target.value })} /></label>
            <label className={label}>Permis (optionnel)<input className={field} placeholder="Permis B" value={cv.permis} onChange={(e) => set({ permis: e.target.value })} /></label>
            <div className={label}>Photo (optionnel)
              <div className="flex items-center gap-2 mt-1">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
                <button onClick={() => fileRef.current?.click()} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Choisir…</button>
                {cv.photo && <button onClick={() => set({ photo: '' })} className="text-xs text-red-500">Retirer</button>}
              </div>
            </div>
            <label className={`${label} sm:col-span-2`}>Accroche / profil (2-3 phrases)
              <textarea rows={3} className={field} placeholder="Résumez votre profil, vos années d’expérience et votre objectif." value={cv.accroche} onChange={(e) => set({ accroche: e.target.value })} />
            </label>
          </div>

          {/* Expériences */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">Expériences professionnelles</h2>
            {cv.experiences.map((e, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
                <input className={field} placeholder="Poste" value={e.poste} onChange={(ev) => setExp(i, { poste: ev.target.value })} />
                <input className={field} placeholder="Entreprise" value={e.entreprise} onChange={(ev) => setExp(i, { entreprise: ev.target.value })} />
                <input className={field} placeholder="Ville" value={e.ville} onChange={(ev) => setExp(i, { ville: ev.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={field} placeholder="Début (ex 2022)" value={e.debut} onChange={(ev) => setExp(i, { debut: ev.target.value })} />
                  <input className={field} placeholder="Fin (ou Actuel)" value={e.fin} onChange={(ev) => setExp(i, { fin: ev.target.value })} />
                </div>
                <textarea rows={2} className={`${field} sm:col-span-2`} placeholder="Missions et résultats (une ligne par point, pensez aux chiffres)." value={e.desc} onChange={(ev) => setExp(i, { desc: ev.target.value })} />
                {cv.experiences.length > 1 && (
                  <button onClick={() => setCv((c) => ({ ...c, experiences: c.experiences.filter((_, j) => j !== i) }))}
                    className="absolute -top-2 -right-2 bg-white border border-gray-200 text-red-500 w-6 h-6 rounded-full text-xs">✕</button>
                )}
              </div>
            ))}
            <button onClick={() => setCv((c) => ({ ...c, experiences: [...c.experiences, { poste: '', entreprise: '', ville: '', debut: '', fin: '', desc: '' }] }))}
              className="text-sm text-blue-600 font-semibold">+ Ajouter une expérience</button>
          </div>

          {/* Formations */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">Formation</h2>
            {cv.formations.map((e, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
                <input className={field} placeholder="Diplôme" value={e.diplome} onChange={(ev) => setEdu(i, { diplome: ev.target.value })} />
                <input className={field} placeholder="Établissement" value={e.etablissement} onChange={(ev) => setEdu(i, { etablissement: ev.target.value })} />
                <input className={field} placeholder="Ville" value={e.ville} onChange={(ev) => setEdu(i, { ville: ev.target.value })} />
                <input className={field} placeholder="Année" value={e.annee} onChange={(ev) => setEdu(i, { annee: ev.target.value })} />
                {cv.formations.length > 1 && (
                  <button onClick={() => setCv((c) => ({ ...c, formations: c.formations.filter((_, j) => j !== i) }))}
                    className="absolute -top-2 -right-2 bg-white border border-gray-200 text-red-500 w-6 h-6 rounded-full text-xs">✕</button>
                )}
              </div>
            ))}
            <button onClick={() => setCv((c) => ({ ...c, formations: [...c.formations, { diplome: '', etablissement: '', ville: '', annee: '' }] }))}
              className="text-sm text-blue-600 font-semibold">+ Ajouter une formation</button>
          </div>

          {/* Compétences / langues / intérêts */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">Compétences &amp; plus</h2>
            <label className={label}>Compétences (séparées par une virgule ou un retour à la ligne)
              <textarea rows={2} className={field} value={cv.competences} onChange={(e) => set({ competences: e.target.value })} placeholder="Word, Excel, Gestion de stock, Soudure…" /></label>
            <label className={label}>Langues
              <input className={field} value={cv.langues} onChange={(e) => set({ langues: e.target.value })} placeholder="Arabe (natif), Français (courant), Anglais (intermédiaire)" /></label>
            <label className={label}>Centres d’intérêt (optionnel)
              <input className={field} value={cv.interets} onChange={(e) => set({ interets: e.target.value })} /></label>
          </div>
        </div>

        {/* ---------------- Aperçu A4 ---------------- */}
        <div className="w-full lg:w-1/2 lg:sticky lg:top-20 overflow-x-auto">
          <div className="hidden lg:block text-xs text-gray-400 mb-2">Aperçu — format A4</div>
          <div id="cv-sheet" className="bg-white shadow-lg mx-auto text-[12px] leading-snug text-gray-800"
            style={{ width: '210mm', minHeight: '297mm', transform: 'none' }}>
            {cv.modele === 'moderne' ? (
              <div className="flex min-h-[297mm]">
                {/* Colonne latérale */}
                <aside className="w-[34%] p-5 text-white" style={{ background: a }}>
                  {cv.photo && <img src={cv.photo} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-white/50" />}
                  <Section title="Contact" light>
                    {cv.email && <P>{cv.email}</P>}
                    {cv.tel && <P>{cv.tel}</P>}
                    {cv.ville && <P>{cv.ville}</P>}
                    {cv.linkedin && <P>{cv.linkedin}</P>}
                    {cv.permis && <P>{cv.permis}</P>}
                  </Section>
                  {competences.length > 0 && (
                    <Section title="Compétences" light>
                      {competences.map((c, i) => <P key={i}>• {c}</P>)}
                    </Section>
                  )}
                  {langues.length > 0 && (
                    <Section title="Langues" light>
                      {langues.map((l, i) => <P key={i}>• {l}</P>)}
                    </Section>
                  )}
                  {interets.length > 0 && (
                    <Section title="Centres d’intérêt" light>
                      {interets.map((l, i) => <P key={i}>• {l}</P>)}
                    </Section>
                  )}
                </aside>
                {/* Colonne principale */}
                <main className="w-[66%] p-6">
                  <h1 className="text-2xl font-black" style={{ color: a }}>{fullName}</h1>
                  {cv.titre && <p className="text-sm font-semibold text-gray-500 mb-3">{cv.titre}</p>}
                  {cv.accroche && <p className="text-[12px] text-gray-600 mb-4">{cv.accroche}</p>}
                  <Block title="Expérience professionnelle" a={a}>
                    {cv.experiences.filter((e) => e.poste || e.entreprise).map((e, i) => (
                      <Item key={i} head={e.poste} sub={[e.entreprise, e.ville].filter(Boolean).join(' · ')} date={periode(e.debut, e.fin)} desc={e.desc} />
                    ))}
                  </Block>
                  <Block title="Formation" a={a}>
                    {cv.formations.filter((e) => e.diplome || e.etablissement).map((e, i) => (
                      <Item key={i} head={e.diplome} sub={[e.etablissement, e.ville].filter(Boolean).join(' · ')} date={e.annee} />
                    ))}
                  </Block>
                </main>
              </div>
            ) : (
              /* Classique / ATS — une colonne sobre */
              <div className="p-10">
                <div className="flex items-center gap-4 border-b-2 pb-3 mb-4" style={{ borderColor: a }}>
                  {cv.photo && <img src={cv.photo} alt="" className="w-20 h-20 rounded object-cover" />}
                  <div>
                    <h1 className="text-2xl font-black text-gray-900">{fullName}</h1>
                    {cv.titre && <p className="text-sm font-semibold" style={{ color: a }}>{cv.titre}</p>}
                    <p className="text-[11px] text-gray-500 mt-1">
                      {[cv.email, cv.tel, cv.ville, cv.linkedin, cv.permis].filter(Boolean).join('  ·  ')}
                    </p>
                  </div>
                </div>
                {cv.accroche && <p className="text-[12px] text-gray-700 mb-4">{cv.accroche}</p>}
                <Block title="Expérience professionnelle" a={a} plain>
                  {cv.experiences.filter((e) => e.poste || e.entreprise).map((e, i) => (
                    <Item key={i} head={e.poste} sub={[e.entreprise, e.ville].filter(Boolean).join(' · ')} date={periode(e.debut, e.fin)} desc={e.desc} />
                  ))}
                </Block>
                <Block title="Formation" a={a} plain>
                  {cv.formations.filter((e) => e.diplome || e.etablissement).map((e, i) => (
                    <Item key={i} head={e.diplome} sub={[e.etablissement, e.ville].filter(Boolean).join(' · ')} date={e.annee} />
                  ))}
                </Block>
                <div className="grid grid-cols-2 gap-6">
                  {competences.length > 0 && <Block title="Compétences" a={a} plain><p className="text-[12px] text-gray-700">{competences.join(' · ')}</p></Block>}
                  {langues.length > 0 && <Block title="Langues" a={a} plain><p className="text-[12px] text-gray-700">{langues.join(' · ')}</p></Block>}
                </div>
                {interets.length > 0 && <Block title="Centres d’intérêt" a={a} plain><p className="text-[12px] text-gray-700">{interets.join(' · ')}</p></Block>}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3 print:hidden">
            Astuce : au moment d’imprimer, choisissez « Enregistrer au format PDF » et désactivez les en-têtes/pieds de page.
          </p>
        </div>
      </div>
    </div>
  );
};

// Petits composants de rendu
const Section: React.FC<{ title: string; light?: boolean; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-4">
    <h3 className="text-[11px] font-black uppercase tracking-wider mb-1.5 opacity-90">{title}</h3>
    <div className="space-y-0.5 text-[11px] opacity-95 break-words">{children}</div>
  </div>
);
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="break-words">{children}</p>;

const Block: React.FC<{ title: string; a: string; plain?: boolean; children: React.ReactNode }> = ({ title, a, children }) => (
  <section className="mb-4">
    <h2 className="text-[13px] font-black uppercase tracking-wide mb-2" style={{ color: a }}>{title}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

const Item: React.FC<{ head: string; sub: string; date: string; desc?: string }> = ({ head, sub, date, desc }) => (
  <div>
    <div className="flex justify-between gap-2">
      <p className="font-bold text-gray-900">{head}</p>
      {date && <p className="text-[11px] text-gray-500 whitespace-nowrap">{date}</p>}
    </div>
    {sub && <p className="text-[11px] text-gray-600">{sub}</p>}
    {desc && (
      <ul className="mt-1 ml-4 list-disc text-[11px] text-gray-700 space-y-0.5">
        {desc.split('\n').map((l, i) => l.trim() && <li key={i}>{l.trim()}</li>)}
      </ul>
    )}
  </div>
);

export default CvBuilder;
