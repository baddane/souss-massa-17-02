import { useState } from 'react';
import { credentialsService, CibleRelance } from '../src/services/credentialsService';
import { useConfirm } from '../src/hooks/useConfirm';

// Relance des entreprises DEJA invitees (onglet Prospection).
//
// Le message ne contient aucun identifiant (voir `api/_relance.ts`) : il donne
// le nombre de candidatures arrivees depuis l'invitation et propose de
// repondre par e-mail. La liste des cibles et les chiffres sont calcules par
// le serveur ; ce panneau les affiche, puis envoie par lots de 5 au plus.

type Apercu = Awaited<ReturnType<typeof credentialsService.relancePreview>>;

export default function RelancePanel() {
  const confirmer = useConfirm();
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rapport, setRapport] = useState<string | null>(null);

  const charger = async () => {
    setChargement(true); setErreur(null);
    try { setApercu(await credentialsService.relancePreview()); }
    catch (e: any) { setErreur(String(e?.message || e)); }
    finally { setChargement(false); }
  };

  const eligibles = (apercu?.cibles || []).filter((c: CibleRelance) => !c.exclue);

  const envoyer = async () => {
    const lot = Math.min(5, eligibles.length);
    if (!lot) return;
    if (!(await confirmer({ message: `Envoyer la relance aux ${lot} premières entreprises de la liste ? L'envoi est irréversible.` }))) return;
    setChargement(true); setErreur(null);
    try {
      const r = await credentialsService.relanceSend(5);
      setRapport(`${r.envoyes.length} relance(s) envoyée(s)${r.erreurs.length ? `, ${r.erreurs.length} échec(s) : ${r.erreurs.map(e => `${e.nom} (${e.erreur})`).join(' ; ')}` : ''}. Restantes : ${r.restantes}.`);
      setApercu(await credentialsService.relancePreview());
    } catch (e: any) { setErreur(String(e?.message || e)); }
    finally { setChargement(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <h3 className="font-bold text-gray-900">Relancer les entreprises déjà invitées</h3>
        <div className="flex-1" />
        <button onClick={charger} disabled={chargement}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {apercu ? 'Actualiser' : 'Voir les entreprises à relancer'}
        </button>
        {apercu && eligibles.length > 0 && (
          <button onClick={envoyer} disabled={chargement}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            Envoyer la relance ({Math.min(5, eligibles.length)})
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Sans mot de passe : le nombre de candidatures reçues depuis l'invitation, le lien, et une réponse possible par e-mail.
        Une entreprise n'est relancée qu'une fois ; les adresses en rebond sont écartées.
      </p>
      {erreur && <p className="text-sm text-red-600 mb-3">{erreur}</p>}
      {rapport && <p className="text-sm text-green-700 mb-3">{rapport}</p>}
      {apercu && (
        <>
          <table className="w-full text-sm mb-4">
            <thead className="text-xs text-gray-500"><tr>
              <th className="text-start py-1">Entreprise</th><th className="text-start">Adresse</th>
              <th className="text-end">Nouvelles</th><th className="text-end">Total</th><th className="text-start ps-3">État</th>
            </tr></thead>
            <tbody>
              {apercu.cibles.map(c => (
                <tr key={c.company_id} className={`border-t border-gray-100 ${c.exclue ? 'text-gray-400' : ''}`}>
                  <td className="py-1">{c.nom}</td><td>{c.destinataire}</td>
                  <td className="text-end">{c.nouvelles}</td><td className="text-end">{c.total}</td>
                  <td className="ps-3">{c.exclue || 'à relancer'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {apercu.exemple && (
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                Aperçu : « {apercu.exemple.sujet} » → {apercu.exemple.destinataire}
              </summary>
              <iframe title="Aperçu de la relance" srcDoc={apercu.exemple.html} className="w-full h-[520px] mt-3 border border-gray-200 rounded-lg" />
            </details>
          )}
        </>
      )}
    </div>
  );
}
