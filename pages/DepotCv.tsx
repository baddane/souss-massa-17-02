import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';
import { useT } from '../src/i18n/LanguageContext';
import { SOUSS_MASSA_CITIES } from '../constants';
import { depotCvService, TYPES_ACCEPTES, TAILLE_MAX, EMAIL_RE } from '../src/services/depotCvService';

// Depot de CV hors candidature.
//
// POURQUOI CETTE PAGE : depuis la fermeture des inscriptions candidat, le
// bouton « Deposer mon CV » du menu renvoyait vers /offres — il n'existait plus
// aucun moyen de laisser son CV sans avoir d'abord repere une offre precise.
// Les candidatures montaient pendant que les NOUVELLES personnes baissaient :
// les memes profils postulaient de plus en plus. Le goulot etait la.
//
// Regle du projet « 0 friction » : aucun compte, aucun mot de passe. Les cinq
// champs demandes sont exactement ceux dont un recruteur a besoin pour
// retrouver et rappeler quelqu'un — rien de plus.

const VIDE = { nom_complet: '', email: '', telephone: '', ville: '', poste: '' };

const DepotCv: React.FC = () => {
  const { t } = useT();
  const [form, setForm] = useState(VIDE);
  const [fichier, setFichier] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);
  const champFichier = useRef<HTMLInputElement>(null);

  const maj = (cle: keyof typeof VIDE) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [cle]: e.target.value }));

  const choisirFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!TYPES_ACCEPTES.includes(f.type)) { toast.error(t('depot.errFormat')); return; }
    if (f.size > TAILLE_MAX) { toast.error(t('depot.errSize')); return; }
    setFichier(f);
  };

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    const rempli = Object.values(form).every((v) => v.trim()) && fichier;
    if (!rempli) { toast.error(t('depot.errRequired')); return; }
    if (!EMAIL_RE.test(form.email.trim())) { toast.error(t('depot.errEmail')); return; }
    // Le consentement n'est PAS coche par defaut ici, contrairement au
    // formulaire de candidature : la CVtheque est tout le service rendu par
    // cette page. Le cocher d'avance ferait reposer la base juridique de toute
    // la collecte sur une case que personne n'a lue.
    if (!consent) { toast.error(t('depot.errConsent')); return; }

    setEnvoi(true);
    const r = await depotCvService.deposer({ ...form, fichier: fichier as File });
    setEnvoi(false);

    // Meme message que le depot soit nouveau ou deja connu : annoncer
    // « vous etes deja enregistre » a qui saisit l'adresse d'un tiers
    // revelerait la presence de cette adresse dans la base.
    if (!r.ok) { toast.error(r.erreur || t('depot.errServer')); return; }
    setFait(true);
  };

  const recommencer = () => {
    setForm(VIDE); setFichier(null); setConsent(false); setFait(false);
    if (champFichier.current) champFichier.current.value = '';
  };

  const champ = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent';
  const label = 'block text-sm font-semibold text-gray-700 mb-1.5';

  return (
    <>
      <SEO
        title={t('depot.seoTitle')}
        description={t('depot.seoDesc')}
        canonical="https://www.soussmassa-rh.com/deposer-mon-cv"
      />

      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto">

          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">{t('depot.title')}</h1>
            <p className="mt-3 text-gray-600 leading-relaxed">{t('depot.subtitle')}</p>
          </div>

          {fait ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
              <h2 className="text-xl font-bold text-gray-900">{t('depot.done')}</h2>
              <p className="mt-2 text-gray-600 leading-relaxed">{t('depot.doneText')}</p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Link to="/offres" className="px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600">
                  {t('depot.doneOffers')}
                </Link>
                <button onClick={recommencer} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50">
                  {t('depot.another')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={envoyer} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className={label} htmlFor="depot-nom">{t('depot.name')}</label>
                  <input id="depot-nom" className={champ} value={form.nom_complet} onChange={maj('nom_complet')} autoComplete="name" required />
                </div>
                <div>
                  <label className={label} htmlFor="depot-tel">{t('depot.phone')}</label>
                  <input id="depot-tel" type="tel" className={champ} value={form.telephone} onChange={maj('telephone')} autoComplete="tel" required />
                </div>
              </div>

              <div>
                <label className={label} htmlFor="depot-email">{t('depot.email')}</label>
                <input id="depot-email" type="email" className={champ} value={form.email} onChange={maj('email')} autoComplete="email" required />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className={label} htmlFor="depot-ville">{t('depot.city')}</label>
                  <select id="depot-ville" className={champ} value={form.ville} onChange={maj('ville')} required>
                    <option value="">{t('depot.cityPick')}</option>
                    {SOUSS_MASSA_CITIES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="depot-poste">{t('depot.job')}</label>
                  <input id="depot-poste" className={champ} value={form.poste} onChange={maj('poste')} placeholder={t('depot.jobHint')} required />
                </div>
              </div>

              <div>
                <label className={label} htmlFor="depot-fichier">{t('depot.file')}</label>
                <input ref={champFichier} id="depot-fichier" type="file" accept=".pdf,.doc,.docx"
                  onChange={choisirFichier}
                  className="block w-full text-sm text-gray-600 file:me-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-gray-900 file:text-white file:font-semibold hover:file:bg-gray-800" />
                <p className="mt-1.5 text-xs text-gray-400">
                  {fichier ? `${fichier.name} · ${Math.round(fichier.size / 1024)} Ko` : t('depot.fileHint')}
                </p>
              </div>

              <label className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-orange-500 shrink-0" />
                <span className="text-sm text-gray-700">
                  {t('depot.consent')}
                  <span className="block text-xs text-gray-500 mt-1">{t('depot.consentHelp')}</span>
                </span>
              </label>

              <button type="submit" disabled={envoi}
                className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 disabled:opacity-50">
                {envoi ? t('depot.sending') : t('depot.submit')}
              </button>
            </form>
          )}

          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {([['depot.why1', 'depot.why1Text'], ['depot.why2', 'depot.why2Text'], ['depot.why3', 'depot.why3Text']] as const)
              .map(([titre, texte]) => (
                <div key={titre} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="font-bold text-gray-900 text-sm">{t(titre)}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t(texte)}</p>
                </div>
              ))}
          </div>

        </div>
      </div>
    </>
  );
};

export default DepotCv;
