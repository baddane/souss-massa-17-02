import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { claimService, type CompanyProfile, type UnclaimedGroup } from '../src/services/companyService';

// Rattacher a un compte entreprise les offres deja en ligne a son nom.
//
// Sans ce rattachement, une entreprise demarchee qui cree un compte ouvre un
// tableau de bord vide : les 469 offres importees ont `company_id = null`, et
// l'espace entreprise filtre dessus, cote interface comme cote RLS.
//
// L'ecran affiche systematiquement le NOMBRE DE CANDIDATURES derriere chaque
// groupe, parce que c'est exactement ce que le rattachement rend visible — donc
// ce sur quoi l'admin doit porter son jugement avant de cliquer.

interface Props {
  company: CompanyProfile;
  onClose: () => void;
}

const ClaimOffersPanel: React.FC<Props> = ({ company, onClose }) => {
  const [term, setTerm] = useState(company.nom_entreprise || '');
  const [groups, setGroups] = useState<UnclaimedGroup[]>([]);
  const [attached, setAttached] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    const res = await claimService.findUnclaimed(q);
    setGroups(res);
    setSelected(new Set());
    setLoading(false);
  }, []);

  const reloadAttached = useCallback(async () => {
    setAttached(await claimService.listAttached(company.id));
  }, [company.id]);

  useEffect(() => { search(company.nom_entreprise || ''); reloadAttached(); }, [company.id, company.nom_entreprise, search, reloadAttached]);

  const toggle = (nom: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(nom) ? next.delete(nom) : next.add(nom);
      return next;
    });

  const chosen = groups.filter((g) => selected.has(g.raison_sociale));
  const nbOffres = chosen.reduce((s, g) => s + g.offres, 0);
  const nbCands = chosen.reduce((s, g) => s + g.candidatures, 0);

  const doAttach = async () => {
    if (chosen.length === 0) return;
    const noms = chosen.map((g) => `« ${g.raison_sociale} »`).join(', ');
    const ok = window.confirm(
      `Rattacher ${nbOffres} offre(s) à « ${company.nom_entreprise} » ?\n\n` +
      `Nom(s) concerné(s) : ${noms}\n\n` +
      `Cette entreprise pourra alors consulter ${nbCands} candidature(s), ` +
      `avec les CV et les coordonnées des candidats. Vérifiez qu'il s'agit bien de la même société.`,
    );
    if (!ok) return;

    setBusy(true);
    try {
      const ids = chosen.flatMap((g) => g.offerIds);
      const n = await claimService.attach(company.id, ids);
      toast.success(`${n} offre(s) rattachée(s) à ${company.nom_entreprise}`);
      await Promise.all([search(term), reloadAttached()]);
    } catch (e: any) {
      toast.error(e?.message || 'Le rattachement a échoué.');
    } finally {
      setBusy(false);
    }
  };

  const doDetach = async (ids: string[], label: string) => {
    if (!window.confirm(`Détacher ${ids.length} offre(s) (${label}) de ce compte ?`)) return;
    setBusy(true);
    try {
      const n = await claimService.detach(company.id, ids);
      toast.success(`${n} offre(s) détachée(s)`);
      await Promise.all([search(term), reloadAttached()]);
    } catch (e: any) {
      toast.error(e?.message || 'Le détachement a échoué.');
    } finally {
      setBusy(false);
    }
  };

  // Regroupement des offres deja rattachees, pour pouvoir tout defaire d'un coup.
  const attachedGroups = attached.reduce((acc: Record<string, string[]>, o: any) => {
    (acc[o.raison_sociale] ||= []).push(o.id);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Rattacher des offres</h2>
            <p className="text-sm text-gray-500 mt-1">{company.nom_entreprise} — {company.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Rattacher une offre donne à ce compte l'accès aux candidatures reçues dessus —
          CV et coordonnées compris. Ne rattachez que les offres dont vous êtes certain
          qu'elles appartiennent bien à cette société.
        </p>

        {/* Déjà rattachées */}
        {Object.keys(attachedGroups).length > 0 && (
          <section className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm">Déjà rattachées à ce compte</h3>
            {Object.entries(attachedGroups).map(([nom, ids]) => (
              <div key={nom} className="flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                <span className="text-sm text-gray-800 truncate">
                  <strong>{nom}</strong> — {ids.length} offre(s)
                </span>
                <button
                  onClick={() => doDetach(ids, nom)}
                  disabled={busy}
                  className="text-sm text-red-600 font-medium hover:underline disabled:opacity-50 whitespace-nowrap"
                >
                  Détacher
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Recherche */}
        <form
          onSubmit={(e) => { e.preventDefault(); search(term); }}
          className="flex gap-2"
        >
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Raison sociale telle qu'elle apparaît sur les offres"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button type="submit" className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold text-sm">
            Chercher
          </button>
        </form>

        {/* Résultats */}
        {loading ? (
          <p className="text-gray-400 text-sm py-6 text-center">Recherche…</p>
        ) : groups.length === 0 ? (
          <p className="text-gray-500 text-sm py-6 text-center">
            Aucune offre sans propriétaire ne correspond à « {term} ».
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {groups.map((g) => (
              <label
                key={g.raison_sociale}
                className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                  selected.has(g.raison_sociale) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(g.raison_sociale)}
                  onChange={() => toggle(g.raison_sociale)}
                  className="mt-1 h-4 w-4 accent-blue-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-900 truncate">{g.raison_sociale}</span>
                  <span className="block text-sm text-gray-600">
                    {g.offres} offre(s)
                    {g.candidatures > 0 && <> · <strong className="text-blue-700">{g.candidatures} candidature(s)</strong></>}
                    {g.villes.length > 0 && <> · {g.villes.slice(0, 3).join(', ')}</>}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">
            {chosen.length === 0 ? 'Aucune sélection' : `${nbOffres} offre(s) · ${nbCands} candidature(s)`}
          </span>
          <button
            onClick={doAttach}
            disabled={busy || chosen.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Rattachement…' : 'Rattacher'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClaimOffersPanel;
