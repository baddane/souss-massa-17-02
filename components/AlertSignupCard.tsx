import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useT } from '../src/i18n/LanguageContext';
import { useAccount } from '../src/hooks/useAccount';
import { candidateAuth, alertsService } from '../src/services/candidateService';
import { EmailAlreadyRegisteredError } from '../src/services/companyService';

// « Recevoir ces offres par email », pose sous la liste des offres.
//
// POURQUOI ICI : /offres est la page la plus visitee du site, et c'etait
// jusqu'ici un cul-de-sac — on y cherchait, on ne trouvait pas ce jour-la, on
// repartait. La recherche que le visiteur vient de faire EST le critere de son
// alerte : on ne lui redemande donc ni metier, ni ville, ni contrat.
//
// Un candidat deja connecte n'a qu'un bouton : l'alerte se cree en un clic.
// Un visiteur anonyme donne un email et un mot de passe — son espace se cree
// avec l'alerte, il n'a rien d'autre a remplir.

interface Props {
  intitule?: string;
  ville?: string;
  contrat?: string;
}

// Le nom est obligatoire en base. Plutot qu'un troisieme champ, on le derive de
// l'email ; le candidat le corrige en une seconde dans son profil.
function nameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'candidat';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Candidat';
}

const AlertSignupCard: React.FC<Props> = ({ intitule, ville, contrat }) => {
  const { t } = useT();
  const navigate = useNavigate();
  const account = useAccount();
  const [form, setForm] = useState({ email: '', password: '' });
  const [saving, setSaving] = useState(false);

  // Une entreprise n'a rien a faire ici ; tant qu'on ne sait pas qui regarde, on
  // n'affiche rien plutot que de faire clignoter le mauvais formulaire.
  if (account.kind === 'company' || account.kind === 'loading') return null;

  const criteria = [intitule, ville, contrat].filter(Boolean).join(' · ');

  const createForLoggedIn = async () => {
    if (!account.id) return;
    setSaving(true);
    try {
      await alertsService.create(account.id, {
        intitule: intitule || null,
        ville: ville || null,
        type_contrat: contrat || null,
        frequence: 'quotidienne',
      });
      toast.success(t('alerts.card.created'));
      navigate('/espace-candidat');
    } catch (e: any) {
      toast.error(e?.message || t('cand.error.generic'));
    } finally {
      setSaving(false);
    }
  };

  const createWithAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) { toast.warning(t('cand.error.fillRequired')); return; }
    if (form.password.length < 8) { toast.warning(t('cand.error.passwordShort')); return; }
    setSaving(true);
    try {
      const userId = await candidateAuth.signUp(form.email.trim(), form.password, nameFromEmail(form.email));
      await alertsService.create(userId, {
        intitule: intitule || null,
        ville: ville || null,
        type_contrat: contrat || null,
        frequence: 'quotidienne',
      });
      // Le profil est vide a ce stade : on emmene le candidat dessus pour qu'il
      // depose son CV, ce qui est l'etape qui a vraiment de la valeur ensuite.
      toast.success(t('alerts.card.created'));
      navigate('/espace-candidat');
    } catch (err: any) {
      if (err instanceof EmailAlreadyRegisteredError) toast.info(t('alerts.card.exists'));
      else toast.error(err?.message || t('cand.error.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-4 mt-10">
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 sm:p-7">
        <h2 className="text-lg font-bold text-gray-900">{t('alerts.card.title')}</h2>
        <p className="text-sm text-gray-600 mt-1">{t('alerts.card.text')}</p>

        <p className="text-sm text-gray-700 mt-3">
          <span className="text-gray-500">{t('alerts.card.criteria')} </span>
          <span className="font-semibold">{criteria || t('alerts.card.all')}</span>
        </p>

        {account.kind === 'candidate' ? (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={createForLoggedIn}
              disabled={saving}
              className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              {saving ? t('alerts.card.submitting') : t('alerts.card.oneClick')}
            </button>
            <Link to="/espace-candidat" className="text-sm text-gray-600 font-medium hover:underline">
              {t('alerts.card.manage')}
            </Link>
          </div>
        ) : (
          <form onSubmit={createWithAccount} className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t('alerts.card.email')}
              className="px-4 py-3 rounded-xl border border-orange-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t('alerts.card.password')}
              className="px-4 py-3 rounded-xl border border-orange-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {saving ? t('alerts.card.submitting') : t('alerts.card.submit')}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default AlertSignupCard;
