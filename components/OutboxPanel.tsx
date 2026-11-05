import { useEffect, useState } from 'react';
import { supabaseOffers } from '../src/services/supabase';
import { useConfirm } from '../src/hooks/useConfirm';
import { corpsMessage } from '../api/_gabarit';

// File « Messages préparés » (table `outbox`, migration 038).
//
// Regle du 05/11/2026 : tout e-mail part de l'admin, au gabarit du site et
// depuis contact@soussmassa-rh.com. Les messages rediges hors de l'interface
// (relance a un recruteur, reponse a un message de contact) sont deposes dans
// la file ; ils s'affichent ici, en tete de l'admin, quel que soit l'onglet.
// L'admin relit, corrige au besoin, puis envoie d'un clic (api/send-outbox).

interface Ligne {
  id: string; to_email: string; to_name: string | null; subject: string; body: string;
  note: string | null; statut: string; erreur: string | null; created_at: string; sent_at: string | null;
}

export default function OutboxPanel() {
  const confirmer = useConfirm();
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [edition, setEdition] = useState<Record<string, { subject: string; body: string }>>({});
  const [apercu, setApercu] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = async () => {
    const depuis = new Date(Date.now() - 7 * 864e5).toISOString();
    const { data, error } = await supabaseOffers
      .from('outbox').select('*')
      .or(`statut.in.(a_envoyer,envoi_en_cours),sent_at.gt.${depuis}`)
      .order('created_at', { ascending: true });
    // Table absente (migration 038 non appliquee) : le panneau reste masque.
    if (error) { setLignes([]); return; }
    setLignes((data || []) as Ligne[]);
  };
  useEffect(() => { charger(); }, []);

  if (!lignes || lignes.length === 0) return null;
  const aEnvoyer = lignes.filter(l => l.statut !== 'envoye' && l.statut !== 'abandonne');

  const valeur = (l: Ligne) => edition[l.id] || { subject: l.subject, body: l.body };
  const modifie = (l: Ligne) => Boolean(edition[l.id]) &&
    (edition[l.id].subject !== l.subject || edition[l.id].body !== l.body);

  const enregistrer = async (l: Ligne) => {
    const v = valeur(l);
    const { error } = await supabaseOffers.from('outbox')
      .update({ subject: v.subject, body: v.body }).eq('id', l.id).eq('statut', 'a_envoyer');
    if (error) throw new Error(error.message);
  };

  const envoyer = async (l: Ligne) => {
    if (!(await confirmer({ message: `Envoyer « ${valeur(l).subject} » à ${l.to_email} ? L'envoi est irréversible.` }))) return;
    setEnCours(l.id); setErreur(null);
    try {
      if (modifie(l)) await enregistrer(l);
      const { data: { session } } = await supabaseOffers.auth.getSession();
      const r = await fetch('/api/send-outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ id: l.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j as any).error || `Échec (${r.status})`);
      setEdition(e => { const n = { ...e }; delete n[l.id]; return n; });
    } catch (e: any) { setErreur(String(e?.message || e)); }
    finally { setEnCours(null); charger(); }
  };

  const abandonner = async (l: Ligne) => {
    if (!(await confirmer({ message: `Retirer ce message de la file ? Il ne sera pas envoyé.`, danger: true, confirmLabel: 'Retirer' }))) return;
    await supabaseOffers.from('outbox').update({ statut: 'abandonne' }).eq('id', l.id).eq('statut', 'a_envoyer');
    charger();
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
      <h2 className="font-bold text-gray-900 mb-1">Messages préparés ({aEnvoyer.length} à envoyer)</h2>
      <p className="text-sm text-gray-600 mb-4">
        Relisez, corrigez si besoin, puis envoyez : le message part depuis contact@soussmassa-rh.com, au gabarit du site.
      </p>
      {erreur && <p className="text-sm text-red-600 mb-3">{erreur}</p>}
      <div className="space-y-4">
        {lignes.map(l => {
          const v = valeur(l);
          const ouvert = l.statut === 'a_envoyer';
          return (
            <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
                <span className="font-semibold text-gray-900">À : {l.to_name ? `${l.to_name} <${l.to_email}>` : l.to_email}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  l.statut === 'envoye' ? 'bg-green-100 text-green-700' : l.statut === 'abandonne' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-800'}`}>
                  {l.statut === 'envoye' ? `envoyé le ${new Date(l.sent_at || '').toLocaleDateString('fr-FR')}` : l.statut.replace('_', ' ')}
                </span>
              </div>
              {l.note && <p className="text-xs text-gray-500 mb-2">Note : {l.note}</p>}
              {l.erreur && ouvert && <p className="text-xs text-red-600 mb-2">Dernier essai : {l.erreur}</p>}
              <input value={v.subject} disabled={!ouvert}
                onChange={e => setEdition(s => ({ ...s, [l.id]: { ...v, subject: e.target.value } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold mb-2 disabled:bg-gray-50" />
              <textarea value={v.body} disabled={!ouvert} rows={ouvert ? 8 : 3}
                onChange={e => setEdition(s => ({ ...s, [l.id]: { ...v, body: e.target.value } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
              {ouvert && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={() => envoyer(l)} disabled={enCours === l.id}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {enCours === l.id ? 'Envoi…' : 'Envoyer'}
                  </button>
                  <button onClick={() => setApercu(apercu === l.id ? null : l.id)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    {apercu === l.id ? 'Masquer l’aperçu' : 'Aperçu'}
                  </button>
                  <button onClick={() => abandonner(l)}
                    className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600">Retirer</button>
                </div>
              )}
              {apercu === l.id && (
                <iframe title="Aperçu" srcDoc={corpsMessage(v.body)} className="w-full h-[480px] mt-3 border border-gray-200 rounded-lg" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
