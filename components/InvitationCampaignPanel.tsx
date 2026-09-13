import { useMemo, useState } from 'react';
import { credentialsService } from '../src/services/credentialsService';
import { OutreachTarget, EMAIL_RE } from '../src/services/outreachService';
import { useConfirm } from '../src/hooks/useConfirm';

// Campagne d'acces depuis l'onglet Prospection : le message contient les
// avantages du service, PUIS les identifiants, PUIS le lien de connexion — cet
// ordre est impose cote serveur (`api/_invitation.ts`) et n'est volontairement
// PAS modifiable ici.
//
// Le corps n'est pas un modele editable, contrairement au message libre plus
// haut dans l'onglet : il contient un MOT DE PASSE. Le laisser saisir a la main
// exposerait a envoyer un mot de passe errone (l'entreprise ne peut plus se
// connecter) ou a copier celui d'une autre societe. Il est donc compose par le
// serveur, a partir de Supabase Auth, et l'admin le relit — il ne l'ecrit pas.

interface Props {
  cibles: OutreachTarget[];          // cibles cochees dans le tableau
  onEnvoye: () => void;              // recharger la liste apres un envoi reel
}

type Apercu = Awaited<ReturnType<typeof credentialsService.previewTarget>>;

const LOT_DEFAUT = 5;

export default function InvitationCampaignPanel({ cibles, onEnvoye }: Props) {
  const confirmer = useConfirm();
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [chargement, setChargement] = useState<string | null>(null);
  const [emailTest, setEmailTest] = useState('');
  const [lot, setLot] = useState(LOT_DEFAUT);
  const [rapport, setRapport] = useState<null | {
    envoyes: { nom: string; email: string; candidatures: number }[];
    erreurs: { nom: string; erreur: string }[];
    restantes: number;
  }>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const joignables = useMemo(
    () => cibles.filter(c => c.email && EMAIL_RE.test(c.email)),
    [cibles],
  );
  const dejaContactees = joignables.filter(c => c.statut === 'contacte');
  const premiere = joignables[0] || null;

  const executer = async (cle: string, action: () => Promise<void>) => {
    setChargement(cle); setErreur(null);
    try { await action(); }
    catch (e: any) { setErreur(String(e?.message || e)); }
    finally { setChargement(null); }
  };

  const voirApercu = () => premiere && executer('apercu', async () => {
    setApercu(await credentialsService.previewTarget(premiere.id));
  });

  const envoyerTest = () => premiere && executer('test', async () => {
    const adresse = emailTest.trim();
    if (!EMAIL_RE.test(adresse)) throw new Error('Adresse de test invalide.');
    const r: any = await credentialsService.testTarget(premiere.id, adresse);
    setRapport(null);
    setErreur(null);
    alert(`Test envoyé à ${adresse}.\n\nContenu : le message exact de « ${r.nom_entreprise} », `
      + `avec son vrai mot de passe et un bandeau de test en tête.\n`
      + `Aucune entreprise n'a été contactée, aucun statut n'a changé.`);
  });

  const envoyerReel = () => executer('envoi', async () => {
    const n = Math.min(lot, joignables.length);
    const avert = dejaContactees.length
      ? `\n\n${dejaContactees.length} de ces entreprises ont DÉJÀ été contactées : elles recevront le message une seconde fois.`
      : '';
    const ok = await confirmer({
      message: `Envoyer les accès à ${n} entreprise(s) ?\n\n`
        + `Chaque message contient le mot de passe du compte. Une adresse erronée donne à un inconnu `
        + `l'accès aux candidatures et aux CV de l'entreprise.${avert}`,
      danger: true,
      confirmLabel: `Envoyer à ${n}`,
    });
    if (!ok) return;

    const r = await credentialsService.sendTargets(joignables.map(c => c.id), lot);
    setRapport({
      envoyes: r.details.map(d => ({ nom: d.nom_entreprise, email: d.email, candidatures: d.candidatures })),
      erreurs: r.erreurs.map(e => ({ nom: e.raison_sociale, erreur: e.erreur })),
      restantes: r.restantes,
    });
    setApercu(null);
    onEnvoye();
  });

  const enCours = (cle: string) => chargement === cle;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-gray-900">Invitation avec accès</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Message personnalisé par entreprise : présentation du service gratuit, candidatures en
            attente, identifiant et mot de passe, puis lien de connexion.
          </p>
        </div>
        <div className="text-sm text-gray-600 whitespace-nowrap">
          <span className="font-bold text-gray-900">{joignables.length}</span> joignable(s)
          {cibles.length > joignables.length && (
            <span className="text-gray-400"> · {cibles.length - joignables.length} sans adresse valide</span>
          )}
        </div>
      </div>

      {joignables.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
          Cochez au moins une entreprise disposant d'une adresse e-mail valide dans le tableau ci-dessous.
        </p>
      ) : (
        <>
          {dejaContactees.length > 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              {dejaContactees.length} entreprise(s) cochée(s) ont déjà le statut « Contacté » :
              un nouvel envoi leur enverrait le message une seconde fois.
            </p>
          )}

          {/* Apercu — le message part avec un mot de passe, on doit pouvoir le relire */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button onClick={voirApercu} disabled={enCours('apercu')}
              className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {enCours('apercu') ? 'Composition…' : `Aperçu pour « ${premiere?.raison_sociale} »`}
            </button>
            {apercu && (
              <button onClick={() => setApercu(null)} className="text-sm text-gray-500 hover:text-gray-700">
                Masquer l'aperçu
              </button>
            )}
          </div>

          {apercu && (
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
              <div className="bg-gray-50 px-4 py-3 text-sm border-b border-gray-200 space-y-1">
                <p><span className="text-gray-500">Destinataire :</span> <strong>{apercu.destinataire}</strong></p>
                <p><span className="text-gray-500">Identifiant envoyé :</span> <code className="text-xs">{apercu.identifiant}</code></p>
                <p><span className="text-gray-500">Objet :</span> <strong>{apercu.sujet}</strong></p>
                <p className="text-gray-500 text-xs">
                  {apercu.candidatures} candidature(s) · {apercu.offres} offre(s) en ligne ·
                  {' '}{apercu.profils_cvtheque} profils CVthèque
                  {apercu.deja_envoye_le && ` · déjà envoyé le ${new Date(apercu.deja_envoye_le).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
              {/* iframe sandbox : le HTML de l'e-mail ne doit pas heriter des
                  styles de l'admin, sinon l'apercu ment sur le rendu reel. */}
              <iframe title="Aperçu de l'e-mail" srcDoc={apercu.html} sandbox=""
                className="w-full h-[480px] bg-white" />
            </div>
          )}

          {/* Envoi de test */}
          <div className="border-t border-gray-100 pt-4 mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Envoyer un test — le message exact de « {premiere?.raison_sociale} », à votre adresse
            </label>
            <div className="flex flex-wrap gap-2">
              <input type="email" value={emailTest} onChange={e => setEmailTest(e.target.value)}
                placeholder="votre@email.com (test)"
                className="flex-1 min-w-[220px] px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
              <button onClick={envoyerTest} disabled={enCours('test') || !emailTest.trim()}
                className="px-5 py-2.5 rounded-xl border border-gray-900 text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-900">
                {enCours('test') ? 'Envoi…' : 'Envoyer un test'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Le test contient le vrai mot de passe de l'entreprise et un bandeau d'avertissement.
              Aucun statut n'est modifié.
            </p>
          </div>

          {/* Envoi definitif */}
          <div className="border-t border-gray-100 pt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-600">
              Par lot de
              <select value={lot} onChange={e => setLot(Number(e.target.value))}
                className="mx-2 px-2 py-1.5 border border-gray-200 rounded-lg text-sm">
                {[5, 10, 15, 25].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button onClick={envoyerReel} disabled={enCours('envoi')}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
              {enCours('envoi') ? 'Envoi en cours…' : `Envoyer aux ${Math.min(lot, joignables.length)} sélectionnée(s)`}
            </button>
            <p className="text-xs text-gray-400">
              Par lots courts, en regardant les rebonds entre deux : une rafale vers des adresses
              non vérifiées dégraderait la délivrabilité de tous les envois du site.
            </p>
          </div>
        </>
      )}

      {erreur && (
        <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{erreur}</p>
      )}

      {rapport && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <h4 className="font-bold text-gray-900 text-sm mb-2">
            Rapport d'envoi — {rapport.envoyes.length} envoyé(s), {rapport.erreurs.length} en échec
            {rapport.restantes > 0 && `, ${rapport.restantes} restante(s) pour le prochain lot`}
          </h4>
          {rapport.envoyes.length > 0 && (
            <ul className="text-sm text-gray-700 space-y-1 mb-3">
              {rapport.envoyes.map((e, i) => (
                <li key={i} className="flex flex-wrap gap-x-2">
                  <span className="text-green-600">✓</span>
                  <strong>{e.nom}</strong>
                  <span className="text-gray-400">{e.email}</span>
                  <span className="text-gray-500">— {e.candidatures} candidature(s) annoncée(s)</span>
                </li>
              ))}
            </ul>
          )}
          {rapport.erreurs.length > 0 && (
            <ul className="text-sm text-red-700 space-y-1">
              {rapport.erreurs.map((e, i) => (
                <li key={i}><span className="font-semibold">{e.nom}</span> — {e.erreur}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
