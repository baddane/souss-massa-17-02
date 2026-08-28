import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';
import { useT, cityLabel, contractLong } from '../src/i18n/LanguageContext';
import { SOUSS_MASSA_CITIES } from '../constants';
import { companyAuth, EmailAlreadyRegisteredError, type OfferForm } from '../src/services/companyService';

const SECTORS = ['informatique', 'commercial', 'administratif', 'industrie', 'sante', 'enseignement', 'tourisme', 'construction'];
const CONTRACTS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];

// L'inscription commence par L'OFFRE, pas par le compte.
//
// Avant : on demandait a une entreprise de creer un compte, d'attendre une
// validation, puis seulement de rediger son annonce. On reclamait donc un
// engagement avant d'avoir rendu le moindre service. Desormais elle ecrit ce
// pour quoi elle est venue — son offre — et ne donne ses coordonnees qu'a la
// derniere etape, ou elles ont un sens evident : c'est la qu'arriveront les
// candidatures.
//
// Rien n'est affaibli cote moderation : l'offre part en `en_attente` et suit
// exactement le meme circuit de validation qu'avant.
//
// Une entreprise qui veut seulement un compte garde son chemin : le lien
// « Je n'ai pas encore d'offre a publier » saute directement a l'etape 2.

const emptyOffer = {
  emploi_metier: '', ville: '', type_contrat: 'CDI', nbre_postes: 1,
  full_description: '', skills: '', suggested_salary_range: '',
};

const CompanyRegister: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [withOffer, setWithOffer] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [offer, setOffer] = useState(emptyOffer);
  const [form, setForm] = useState({ nom_entreprise: '', email: '', telephone: '', ville: '', secteur: '' });

  const setO = (k: string, v: string | number) => setOffer((o) => ({ ...o, [k]: v }));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleGoogle = async () => {
    try { await companyAuth.signInWithGoogle(); }
    catch { toast.error(t('company.error.generic')); }
  };

  const goToContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offer.emploi_metier.trim() || !offer.ville || !offer.full_description.trim()) {
      toast.warning(t('company.error.fillRequired'));
      return;
    }
    // La ville de l'offre est le meilleur defaut pour la fiche entreprise.
    setForm((f) => ({ ...f, ville: f.ville || offer.ville }));
    setStep(2);
  };

  const skipOffer = () => { setWithOffer(false); setStep(2); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_entreprise.trim() || !form.email.trim()) {
      toast.warning(t('company.error.fillRequired'));
      return;
    }
    setSending(true);
    try {
      const payload: OfferForm | undefined = withOffer
        ? {
            emploi_metier: offer.emploi_metier.trim(),
            ville: offer.ville,
            type_contrat: offer.type_contrat,
            nbre_postes: Number(offer.nbre_postes) || 1,
            full_description: offer.full_description.trim(),
            required_skills: offer.skills.split(',').map((x) => x.trim()).filter(Boolean),
            suggested_salary_range: offer.suggested_salary_range.trim() || undefined,
          }
        : undefined;

      await companyAuth.signUp(form.email.trim(), {
        nom_entreprise: form.nom_entreprise,
        telephone: form.telephone,
        ville: form.ville,
        secteur: form.secteur,
      }, payload);
      setSent(true);
    } catch (err: any) {
      if (err instanceof EmailAlreadyRegisteredError) toast.error(t('company.register.emailTaken'));
      else toast.error(err?.message || t('company.error.generic'));
    } finally {
      setSending(false);
    }
  };

  const field = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  if (sent) {
    return (
      <>
        <SEO title={t('company.register.title')} canonical="/inscription-entreprise" />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('company.register.successTitle')}</h1>
            <p className="text-gray-600">
              {withOffer ? t('company.reg.successWithOffer') : t('company.register.successText')}
            </p>
            <button onClick={() => navigate('/connexion-entreprise')} className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
              {t('company.toLogin')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title={withOffer ? t('company.reg.offerTitle') : t('company.register.title')}
        description={t('company.reg.offerSubtitle')}
        canonical="/inscription-entreprise"
      />
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {withOffer ? t('company.reg.offerTitle') : t('company.register.title')}
        </h1>
        <p className="text-gray-500 mb-6">
          {withOffer ? t('company.reg.offerSubtitle') : t('company.register.subtitle')}
        </p>

        {withOffer && (
          <ol className="flex items-center gap-3 text-sm mb-6" aria-label="Progression">
            {([1, 2] as const).map((n) => (
              <li key={n} className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full grid place-items-center text-xs font-bold ${
                  step >= n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</span>
                <span className={step >= n ? 'font-semibold text-gray-900' : 'text-gray-400'}>
                  {n === 1 ? t('company.reg.stepOffer') : t('company.reg.stepContact')}
                </span>
                {n === 1 && <span className="w-6 h-px bg-gray-300" />}
              </li>
            ))}
          </ol>
        )}

        {step === 1 ? (
          <form onSubmit={goToContact} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className={label}>{t('company.post.jobTitle')} *</label>
              <input type="text" required value={offer.emploi_metier}
                onChange={(e) => setO('emploi_metier', e.target.value)} className={field} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>{t('company.city')} *</label>
                <select required value={offer.ville} onChange={(e) => setO('ville', e.target.value)} className={field}>
                  <option value="">—</option>
                  {SOUSS_MASSA_CITIES.map((c) => <option key={c} value={c}>{cityLabel(t, c)}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>{t('job.contractType')}</label>
                <select value={offer.type_contrat} onChange={(e) => setO('type_contrat', e.target.value)} className={field}>
                  {CONTRACTS.map((c) => <option key={c} value={c}>{contractLong(t, c)}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>{t('company.post.positions')}</label>
                <input type="number" min={1} max={99} value={offer.nbre_postes}
                  onChange={(e) => setO('nbre_postes', Number(e.target.value))} className={field} />
              </div>
              <div>
                <label className={label}>{t('company.post.salary')}</label>
                <input type="text" value={offer.suggested_salary_range}
                  onChange={(e) => setO('suggested_salary_range', e.target.value)}
                  placeholder={t('company.post.salaryHint')} className={field} />
              </div>
            </div>
            <div>
              <label className={label}>{t('company.post.description')} *</label>
              <textarea required rows={6} value={offer.full_description}
                onChange={(e) => setO('full_description', e.target.value)}
                placeholder={t('company.post.descriptionPlaceholder')} className={field} />
            </div>
            <div>
              <label className={label}>{t('company.post.skills')}</label>
              <input type="text" value={offer.skills} onChange={(e) => setO('skills', e.target.value)}
                placeholder={t('company.post.skillsHint')} className={field} />
            </div>

            <button type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors">
              {t('company.reg.next')}
            </button>

            <button type="button" onClick={skipOffer}
              className="w-full text-sm text-gray-500 hover:text-gray-800 underline">
              {t('company.reg.skipOffer')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            {withOffer && (
              <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                {t('company.reg.recap', { poste: offer.emploi_metier, ville: cityLabel(t, offer.ville) })}
              </p>
            )}
            <p className="text-sm text-gray-500">{t('company.reg.contactSubtitle')}</p>

            <button type="button" onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2.5 border border-gray-300 rounded-xl py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t('company.withGoogle')}
            </button>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="h-px bg-gray-200 flex-1" />{t('company.or')}<span className="h-px bg-gray-200 flex-1" />
            </div>

            <div>
              <label className={label}>{t('company.companyName')} *</label>
              <input type="text" required value={form.nom_entreprise}
                onChange={(e) => set('nom_entreprise', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>{t('company.email')} *</label>
              <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="contact@entreprise.com" className={field} />
            </div>
            <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              {t('company.register.passwordByEmail')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>{t('company.phone')}</label>
                <input type="tel" value={form.telephone} onChange={(e) => set('telephone', e.target.value)}
                  placeholder="06 XX XX XX XX" className={field} />
              </div>
              <div>
                <label className={label}>{t('company.city')}</label>
                <select value={form.ville} onChange={(e) => set('ville', e.target.value)} className={field}>
                  <option value="">—</option>
                  {SOUSS_MASSA_CITIES.map((c) => <option key={c} value={c}>{cityLabel(t, c)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>{t('company.sector')}</label>
              <select value={form.secteur} onChange={(e) => set('secteur', e.target.value)} className={field}>
                <option value="">—</option>
                {SECTORS.map((s) => <option key={s} value={s}>{t(`sector.${s}`)}</option>)}
              </select>
            </div>

            <button type="submit" disabled={sending}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
              {sending ? t('company.register.submitting') : withOffer ? t('company.reg.submitWithOffer') : t('company.register.submit')}
            </button>

            {withOffer && (
              <button type="button" onClick={() => setStep(1)}
                className="w-full text-sm text-gray-500 hover:text-gray-800 underline">
                {t('company.reg.back')}
              </button>
            )}
            <p className="text-center text-sm text-gray-500">
              {t('company.register.haveAccount')}{' '}
              <Link to="/connexion-entreprise" className="text-blue-600 font-medium hover:underline">{t('company.toLogin')}</Link>
            </p>
          </form>
        )}
      </div>
    </>
  );
};

export default CompanyRegister;
