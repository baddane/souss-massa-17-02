import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { credentialsService, type CompanyCredential } from '../src/services/credentialsService';
import CompanyEditPanel from './CompanyEditPanel';

// Onglet « Identifiants » : les comptes entreprise provisionnes par la
// plateforme, avec leur login et leur mot de passe en clair, pour pouvoir les
// (re)transmettre.
//
// AVERTISSEMENT ASSUME : conserver des mots de passe en clair signifie qu'un
// acces au compte admin ouvre tous les espaces entreprise, donc les CV et les
// coordonnees des candidats. C'est le prix de pouvoir renvoyer ses identifiants
// a une entreprise qui les a perdus. La table est en RLS admin stricte.
//
// Toute modification d'identifiant ou de mot de passe passe par l'endpoint
// serveur : ces valeurs vivent dans Supabase Auth. Un UPDATE direct ferait
// afficher un mot de passe qui ne fonctionne pas.

const CredentialsTab: React.FC = () => {
  const [rows, setRows] = useState<CompanyCredential[]>([]);
  const [pending, setPending] = useState<{ raison_sociale: string; offres: number; ville: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ raison_sociale: '', email: '', ville: '' });
  const [progress, setProgress] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, p] = await Promise.all([credentialsService.list(), credentialsService.pending()]);
    setRows(r); setPending(p); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      (r.nom_entreprise || '').toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle));
  }, [rows, q]);

  const fictifs = rows.filter((r) => r.email_fictif).length;

  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try { const res = await fn(); toast.success(ok); await load(); return res; }
    catch (e: any) { toast.error(e?.message || 'Opération impossible'); }
    finally { setBusy(false); }
  };

  const provisionAll = () => {
    if (!window.confirm(
      `Créer un compte pour chaque entreprise ayant des offres en ligne et pas encore de compte ?\n\n` +
      `${pending.length} entreprise(s) concernée(s). Chaque compte reçoit un mot de passe généré et ` +
      `récupère ses offres existantes. Les noms non identifiables (« Entreprise confidentielle », « xxxx »…) ` +
      `sont ignorés : ils recouvrent plusieurs sociétés.`,
    )) return;
    // Enchaine les lots jusqu'a epuisement : une seule requete pour 170
    // entreprises depasserait la duree maximale d'une fonction serverless.
    run(async () => {
      let crees = 0, ignorees = 0, tours = 0;
      const erreurs: string[] = [];
      for (;;) {
        const r = await credentialsService.provisionAll();
        crees += r.provisionnees || 0;
        ignorees += (r.ignorees || []).length;
        if (r.erreurs?.length) erreurs.push(...r.erreurs);
        tours += 1;
        setProgress(`${crees} compte(s) créé(s)…`);
        if (!r.restantes || r.examinees === 0 || tours > 40) break;
      }
      setProgress('');
      toast.info(`${crees} compte(s) créé(s), ${ignorees} ignoré(s)`);
      if (erreurs.length) console.error('Provisionnement :', erreurs);
      return { provisionnees: crees };
    }, 'Provisionnement terminé');
  };

  const copier = async (txt: string, quoi: string) => {
    try { await navigator.clipboard.writeText(txt); toast.success(`${quoi} copié`); }
    catch { toast.info(txt); }
  };

  const cellule = 'px-3 py-2.5 align-top';

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900">
        Les mots de passe sont conservés en clair pour pouvoir être retransmis. Un accès à ce compte
        admin donne donc accès à tous les espaces entreprise — et aux CV des candidats. Invitez chaque
        entreprise à changer son mot de passe à la première connexion.
      </div>

      {/* Provisionnement en masse */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">Entreprises sans compte</h3>
            <p className="text-sm text-gray-500">
              {pending.length} entreprise(s) ont des offres en ligne et aucun compte.
            </p>
          </div>
          <button
            onClick={provisionAll}
            disabled={busy || pending.length === 0}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? (progress || 'Création…') : `Créer les ${pending.length} comptes`}
          </button>
        </div>
        {pending.length > 0 && (
          <p className="text-xs text-gray-500">
            {pending.slice(0, 6).map((p) => `${p.raison_sociale} (${p.offres})`).join(' · ')}
            {pending.length > 6 && ` … et ${pending.length - 6} autres`}
          </p>
        )}
      </section>

      {/* Création manuelle */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-gray-900">Créer un compte à la main</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input value={form.raison_sociale} onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })}
            placeholder="Raison sociale *" className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email (login) *" className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          <input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })}
            placeholder="Ville" className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          <button
            onClick={() => {
              if (!form.raison_sociale.trim() || !form.email.trim()) { toast.warning('Raison sociale et email requis'); return; }
              run(() => credentialsService.provisionOne({ ...form }), 'Compte créé')
                .then(() => setForm({ raison_sociale: '', email: '', ville: '' }));
            }}
            disabled={busy}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm disabled:opacity-50"
          >
            Créer
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Le mot de passe est généré automatiquement et les offres portant exactement cette raison
          sociale sont rattachées au compte.
        </p>
      </section>

      {/* Liste */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Comptes créés ({rows.length})</h3>
            {fictifs > 0 && (
              <p className="text-xs text-amber-700 mt-0.5">
                {fictifs} avec un identifiant technique — aucun email ne leur sera envoyé tant que
                leur vraie adresse n'est pas renseignée.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-56" />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} className="accent-blue-600" />
              Afficher les mots de passe
            </label>
          </div>
        </div>

        {loading ? (
          <p className="p-6 text-gray-400 text-sm">Chargement…</p>
        ) : visibles.length === 0 ? (
          <p className="p-6 text-gray-500 text-sm">Aucun compte provisionné pour l'instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className={`${cellule} text-left`}>Entreprise</th>
                  <th className={`${cellule} text-left`}>Identifiant</th>
                  <th className={`${cellule} text-left`}>Mot de passe</th>
                  <th className={`${cellule} text-left`}>Offres</th>
                  <th className={`${cellule} text-left`}>Envoyé</th>
                  <th className={`${cellule} text-left`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map((r) => (
                  <React.Fragment key={r.company_id}>
                  <tr className="hover:bg-gray-50/60">
                    <td className={cellule}>
                      <div className="font-semibold text-gray-900">{r.nom_entreprise || '—'}</div>
                      <div className="text-xs text-gray-500">{r.ville || ''}</div>
                    </td>
                    <td className={cellule}>
                      <button onClick={() => copier(r.email, 'Identifiant')} className="text-blue-700 hover:underline break-all text-left">
                        {r.email}
                      </button>
                      {r.email_fictif && (
                        <span className="block mt-1 text-[11px] font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5 w-fit">
                          identifiant technique
                        </span>
                      )}
                    </td>
                    <td className={cellule}>
                      <button onClick={() => copier(r.mot_de_passe, 'Mot de passe')} className="font-mono text-gray-800 hover:underline">
                        {showPwd ? r.mot_de_passe : '••••••••••'}
                      </button>
                    </td>
                    <td className={`${cellule} text-gray-700`}>{r.offres ?? 0}</td>
                    <td className={`${cellule} text-xs text-gray-500`}>
                      {r.envoye_le ? new Date(r.envoye_le).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className={cellule}>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setEditId(editId === r.company_id ? null : r.company_id)}
                          disabled={busy}
                          className="text-xs px-2.5 py-1.5 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                        >
                          {editId === r.company_id ? 'Fermer' : 'Modifier'}
                        </button>
                        <button
                          onClick={() => {
                            const p = window.prompt('Nouveau mot de passe (laisser vide pour en générer un) :', '');
                            if (p === null) return;
                            run(() => credentialsService.setPassword(r.company_id, r.email, p || undefined), 'Mot de passe mis à jour');
                          }}
                          disabled={busy}
                          className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          Mot de passe
                        </button>
                        <button
                          onClick={() => run(() => credentialsService.markSent(r.company_id), 'Marqué comme envoyé')}
                          disabled={busy}
                          className="text-xs px-2.5 py-1.5 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50"
                        >
                          Marquer envoyé
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editId === r.company_id && (
                    <tr className="bg-blue-50/40">
                      <td colSpan={6} className="px-4 pb-4">
                        <CompanyEditPanel
                          valeurs={{
                            id: r.company_id,
                            nom_entreprise: r.nom_entreprise || '',
                            email: r.email,
                            ville: r.ville,
                            telephone: r.telephone,
                            secteur: r.secteur,
                            note: r.note,
                            email_fictif: r.email_fictif,
                          }}
                          avecNote
                          onEnregistre={async () => { setEditId(null); await load(); }}
                          onAnnuler={() => setEditId(null)}
                        />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default CredentialsTab;
