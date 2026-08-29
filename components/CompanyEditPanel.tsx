import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { credentialsService } from '../src/services/credentialsService';

// Correction d'une fiche entreprise, partagee par les onglets « Entreprises »
// et « Identifiants » de l'administration — les deux listent les memes comptes,
// et l'admin doit pouvoir corriger la fiche depuis celui ou il se trouve.
//
// DEUX CHEMINS D'ENREGISTREMENT DERRIERE UN SEUL BOUTON :
//   - l'e-mail passe par `api/provision-companies`, qui met Supabase Auth ET les
//     deux tables d'accord. L'ecrire en direct afficherait a l'admin un
//     identifiant avec lequel l'entreprise ne peut pas se connecter ;
//   - le reste part en UPDATE direct (policy `ce_update`).
// L'e-mail est traite en premier : c'est la seule operation qui peut echouer
// cote Auth, et une fiche a moitie enregistree serait pire que rien.
//
// `statut` n'est volontairement pas modifiable ici : c'est une decision de
// moderation, qui a ses propres boutons. Le glisser dans un formulaire de
// correction le ferait basculer par inadvertance.

export interface CompanyEditValues {
  id: string;
  nom_entreprise: string;
  email: string;
  ville?: string | null;
  telephone?: string | null;
  secteur?: string | null;
  note?: string | null;
  email_fictif?: boolean;
}

interface Props {
  valeurs: CompanyEditValues;
  /** La note vit dans `company_credentials` : absente des comptes crees par
      l'entreprise elle-meme, donc masquee hors de l'onglet Identifiants. */
  avecNote?: boolean;
  onEnregistre: () => void | Promise<void>;
  onAnnuler: () => void;
}

const champ = 'mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-normal text-gray-900 bg-white';

const CompanyEditPanel: React.FC<Props> = ({ valeurs, avecNote, onEnregistre, onAnnuler }) => {
  const [form, setForm] = useState({
    nom_entreprise: valeurs.nom_entreprise || '',
    email: valeurs.email || '',
    ville: valeurs.ville || '',
    telephone: valeurs.telephone || '',
    secteur: valeurs.secteur || '',
    note: valeurs.note || '',
  });
  const [busy, setBusy] = useState(false);
  const [orphelines, setOrphelines] = useState<number | null>(null);

  // Combien d'offres sans proprietaire portent deja ce nom : c'est ce que la
  // correction du nom rendra rattachable, et la raison principale de la corriger.
  const compterOrphelines = async (nom: string) => {
    setOrphelines(await credentialsService.offresOrphelinesPourNom(nom));
  };

  const enregistrer = async () => {
    if (!form.nom_entreprise.trim()) { toast.warning('La raison sociale ne peut pas être vide'); return; }
    const email = form.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.warning('Adresse e-mail invalide'); return; }

    setBusy(true);
    try {
      if (email !== valeurs.email) await credentialsService.setEmail(valeurs.id, email);
      await credentialsService.updateProfil(valeurs.id, {
        nom_entreprise: form.nom_entreprise,
        ville: form.ville,
        telephone: form.telephone,
        secteur: form.secteur,
      });
      if (avecNote && (form.note || '') !== (valeurs.note || '')) {
        await credentialsService.setNote(valeurs.id, form.note);
      }
      toast.success('Fiche mise à jour');
      await onEnregistre();
    } catch (e: any) {
      toast.error(e?.message || 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mt-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2 lg:col-span-1">
          Raison sociale
          <input
            value={form.nom_entreprise}
            onChange={(e) => { setForm({ ...form, nom_entreprise: e.target.value }); setOrphelines(null); }}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== valeurs.nom_entreprise) compterOrphelines(v); }}
            className={champ}
          />
          <span className="block font-normal text-gray-400 mt-1">
            Les offres importées sont rattachées sur ce nom exact.
          </span>
          {orphelines !== null && (
            <span className={`block font-normal mt-1 ${orphelines > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
              {orphelines > 0
                ? `${orphelines} offre(s) en ligne portent ce nom et n'ont pas de propriétaire — elles seront rattachables.`
                : 'Aucune offre orpheline ne porte ce nom.'}
            </span>
          )}
        </label>

        <label className="text-xs font-semibold text-gray-600">
          Identifiant (e-mail de connexion)
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={champ} />
          <span className="block font-normal text-gray-400 mt-1">
            {valeurs.email_fictif
              ? "Adresse technique : aucun e-mail ne part tant qu'elle n'est pas remplacée."
              : "Change aussi l'adresse de connexion de l'entreprise."}
          </span>
        </label>

        <label className="text-xs font-semibold text-gray-600">
          Ville
          <input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} className={champ} />
        </label>

        <label className="text-xs font-semibold text-gray-600">
          Téléphone
          <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className={champ} />
        </label>

        <label className="text-xs font-semibold text-gray-600">
          Secteur
          <input value={form.secteur} onChange={(e) => setForm({ ...form, secteur: e.target.value })} className={champ} />
        </label>

        {avecNote && (
          <label className="text-xs font-semibold text-gray-600 sm:col-span-2 lg:col-span-1">
            Note interne
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={champ} />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button
          onClick={enregistrer}
          disabled={busy}
          className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          onClick={onAnnuler}
          disabled={busy}
          className="text-sm px-4 py-2 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Annuler
        </button>
        <span className="text-xs text-gray-400">Le mot de passe se change depuis l'onglet Identifiants.</span>
      </div>
    </div>
  );
};

export default CompanyEditPanel;
