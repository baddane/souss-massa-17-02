import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../components/SEO';
import { useT } from '../src/i18n/LanguageContext';
import { SOUSS_MASSA_CITIES } from '../constants';
import { candidatureStatusKey, companyService } from '../src/services/companyService';
import {
  candidateAuth,
  candidateService,
  alertsService,
  DISPONIBILITES,
  CV_TYPES,
  MAX_CV_SIZE,
  type CandidateProfile,
  type MyCandidature,
  type JobAlert,
} from '../src/services/candidateService';

const CONTRACTS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
const NIVEAUX = ['Sans diplôme', 'Baccalauréat', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat'];
const MAX_ALERTS = 5;

type Tab = 'profile' | 'applications' | 'alerts' | 'account';

// Champs qui comptent dans la barre de completion. Le CV pese double : c'est le
// seul element sans lequel une candidature n'aboutit pas.
const COMPLETION_FIELDS: (keyof CandidateProfile)[] = [
  'nom_complet', 'telephone', 'ville', 'poste_recherche', 'niveau_etudes',
  'diplome', 'competences', 'langues', 'experience_years', 'disponibilite',
];

function completion(p: CandidateProfile): number {
  let filled = 0;
  for (const f of COMPLETION_FIELDS) {
    const v = p[f];
    if (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== '') filled += 1;
  }
  const total = COMPLETION_FIELDS.length + 2;
  if (p.cv_path) filled += 2;
  return Math.round((filled / total) * 100);
}

const listToText = (v: string[] | null) => (v || []).join(', ');
const textToList = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

const CandidateDashboard: React.FC = () => {
  const { t, lang } = useT();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [tab, setTab] = useState<Tab>('profile');

  const [apps, setApps] = useState<MyCandidature[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);

  // ---- Chargement ----
  const load = useCallback(async () => {
    const user = await candidateAuth.currentUser();
    if (!user) { navigate('/connexion-candidat'); return; }

    let prof = await candidateService.getProfile(user.id);
    if (!prof) {
      // Un compte entreprise arrive ici par erreur (mauvais formulaire, ancien
      // marque-page) : on le renvoie vers son espace SANS lui creer de fiche
      // candidat au passage. Rien ne l'interdit cote base — le cloisonnement
      // porte sur les donnees, pas sur les roles — mais lui greffer un second
      // profil serait un effet de bord inattendu.
      const company = await companyService.getProfile(user.id);
      if (company) { navigate('/espace-entreprise'); return; }

      // Compte cree via Google : le profil n'existe pas encore. On le cree a la
      // volee plutot que de bloquer sur un ecran vide (un compte admin, lui,
      // est refuse par la policy `candidats_self_insert`).
      try {
        await candidateService.createProfile(
          user.id,
          user.email || '',
          (user.user_metadata as any)?.full_name || (user.email || '').split('@')[0],
        );
        prof = await candidateService.getProfile(user.id);
      } catch {
        toast.error(t('cand.login.isCompany'));
        navigate('/');
        return;
      }
    }
    if (!prof) { navigate('/connexion-candidat'); return; }

    setProfile(prof);
    const [a, al] = await Promise.all([
      candidateService.getMyCandidatures(prof.email),
      alertsService.list(prof.id),
    ]);
    setApps(a);
    setAlerts(al);
    setLoading(false);
  }, [navigate, t]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    await candidateAuth.signOut();
    navigate('/');
  };

  if (loading || !profile) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400">{t('cand.loading')}</div>;
  }

  const pct = completion(profile);

  return (
    <>
      <SEO title={t('cand.dash.title')} canonical="/espace-candidat" />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('cand.dash.title')}</h1>
            <p className="text-gray-500">{t('cand.dash.welcome', { name: profile.nom_complet })}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800 underline">
            {t('cand.dash.logout')}
          </button>
        </div>

        <StatsStrip t={t} apps={apps.length} alerts={alerts.filter((a) => a.actif).length} profile={profile} pct={pct} />

        <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
          {(['profile', 'applications', 'alerts', 'account'] as Tab[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === k ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t(`cand.tab.${k}`)}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <ProfileTab profile={profile} onSaved={(p) => setProfile(p)} />
        )}
        {tab === 'applications' && <ApplicationsTab apps={apps} lang={lang} />}
        {tab === 'alerts' && (
          <AlertsTab profile={profile} alerts={alerts} onChange={async () => setAlerts(await alertsService.list(profile.id))} />
        )}
        {tab === 'account' && <AccountTab />}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
const StatsStrip: React.FC<{
  t: (k: string, v?: Record<string, string | number>) => string;
  apps: number; alerts: number; profile: CandidateProfile; pct: number;
}> = ({ t, apps, alerts, profile, pct }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="text-2xl font-bold text-gray-900">{apps}</div>
      <div className="text-xs text-gray-500">{t('cand.stat.applications')}</div>
    </div>
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="text-2xl font-bold text-gray-900">{alerts}</div>
      <div className="text-xs text-gray-500">{t('cand.stat.alerts')}</div>
    </div>
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className={`text-sm font-bold ${profile.visible_recruteurs && profile.actif ? 'text-green-600' : 'text-gray-400'}`}>
        {profile.visible_recruteurs && profile.actif ? t('cand.visibility.on') : t('cand.visibility.off')}
      </div>
      <div className="text-xs text-gray-500">{t('cand.stat.visibility')}</div>
    </div>
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="text-2xl font-bold text-gray-900">{pct}%</div>
      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-500 mt-1">{t('cand.stat.completion')}</div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
const ProfileTab: React.FC<{ profile: CandidateProfile; onSaved: (p: CandidateProfile) => void }> = ({ profile, onSaved }) => {
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    nom_complet: profile.nom_complet || '',
    telephone: profile.telephone || '',
    ville: profile.ville || '',
    quartier: profile.quartier || '',
    poste_recherche: profile.poste_recherche || '',
    niveau_etudes: profile.niveau_etudes || '',
    diplome: profile.diplome || '',
    competences: listToText(profile.competences),
    langues: listToText(profile.langues),
    experience_years: profile.experience_years === null ? '' : String(profile.experience_years),
    disponibilite: profile.disponibilite || '',
    contrats_souhaites: profile.contrats_souhaites || [],
    villes_souhaitees: profile.villes_souhaitees || [],
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k: 'contrats_souhaites' | 'villes_souhaitees', v: string) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x: string) => x !== v) : [...f[k], v],
    }));

  const save = async () => {
    setSaving(true);
    try {
      const patch = {
        nom_complet: form.nom_complet.trim(),
        telephone: form.telephone || null,
        ville: form.ville || null,
        quartier: form.quartier || null,
        poste_recherche: form.poste_recherche || null,
        niveau_etudes: form.niveau_etudes || null,
        diplome: form.diplome || null,
        competences: textToList(form.competences),
        langues: textToList(form.langues),
        experience_years: form.experience_years === '' ? null : Number(form.experience_years),
        disponibilite: (form.disponibilite || null) as CandidateProfile['disponibilite'],
        contrats_souhaites: form.contrats_souhaites,
        villes_souhaitees: form.villes_souhaitees,
      };
      await candidateService.updateProfile(profile.id, patch);
      onSaved({ ...profile, ...patch } as CandidateProfile);
      toast.success(t('cand.profile.saved'));
    } catch (e: any) {
      toast.error(e?.message || t('cand.error.generic'));
    } finally {
      setSaving(false);
    }
  };

  // Depot du CV : upload, puis analyse locale pour pre-remplir les champs vides.
  // On n'ecrase jamais une valeur deja saisie a la main par le candidat.
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!CV_TYPES.includes(file.type)) { toast.error(t('cand.cv.formatError')); return; }
    if (file.size > MAX_CV_SIZE) { toast.error(t('cand.cv.sizeError')); return; }

    setUploading(true);
    try {
      const { path, name } = await candidateService.uploadCv(profile.id, file, profile.cv_path);
      await candidateService.updateProfile(profile.id, { cv_path: path, cv_filename: name });

      const res = await candidateService.parseCv(file);
      if (res?.supported) {
        setForm((f) => ({
          ...f,
          telephone: f.telephone || res.parsed.telephone || '',
          ville: f.ville || res.parsed.ville || '',
          quartier: f.quartier || res.parsed.quartier || '',
          poste_recherche: f.poste_recherche || res.parsed.poste || '',
          niveau_etudes: f.niveau_etudes || res.parsed.niveau_etudes || '',
          diplome: f.diplome || res.parsed.diplome || '',
          competences: f.competences || listToText(res.parsed.competences),
          langues: f.langues || listToText(res.parsed.langues),
          experience_years: f.experience_years || (res.parsed.experience_years ?? '') as any,
        }));
        toast.info(t('cand.cv.parsed'));
      } else if (res) {
        toast.info(t('cand.cv.notParsed'));
      }

      onSaved({ ...profile, cv_path: path, cv_filename: name });
      toast.success(t('cand.cv.uploaded'));
    } catch (err: any) {
      toast.error(err?.message === 'FORMAT' ? t('cand.cv.formatError')
        : err?.message === 'SIZE' ? t('cand.cv.sizeError')
        : err?.message || t('cand.error.generic'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const download = async () => {
    if (!profile.cv_path) return;
    const url = await candidateService.cvUrl(profile.cv_path);
    if (url) window.open(url, '_blank', 'noopener');
    else toast.error(t('cand.error.generic'));
  };

  const setFlag = async (patch: { visible_recruteurs?: boolean; actif?: boolean }) => {
    try {
      await candidateService.updateProfile(profile.id, patch);
      onSaved({ ...profile, ...patch });
    } catch (e: any) {
      toast.error(e?.message || t('cand.error.generic'));
    }
  };

  const field = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="space-y-6">
      {/* CV */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-bold text-gray-900 mb-1">{t('cand.cv.title')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('cand.cv.hint')}</p>
        {profile.cv_path ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-800 truncate max-w-xs">{profile.cv_filename || 'CV'}</span>
            <button onClick={download} className="text-sm text-blue-600 font-medium hover:underline">{t('cand.cv.download')}</button>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-60">
              {uploading ? t('cand.cv.uploading') : t('cand.cv.replace')}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-3">{t('cand.cv.none')}</p>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-orange-600 disabled:opacity-60">
              {uploading ? t('cand.cv.uploading') : t('cand.cv.upload')}
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFile} className="hidden" />
      </section>

      {/* Visibilite / recherche active */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <Toggle
          checked={profile.visible_recruteurs}
          onChange={(v) => setFlag({ visible_recruteurs: v })}
          title={t('cand.visibility.title')}
          help={t('cand.visibility.help')}
        />
        <div className="h-px bg-gray-100" />
        <Toggle
          checked={profile.actif}
          onChange={(v) => setFlag({ actif: v })}
          title={t('cand.active.title')}
          help={t('cand.active.help')}
        />
      </section>

      {/* Profil */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="font-bold text-gray-900">{t('cand.profile.title')}</h2>
          <p className="text-sm text-gray-500">{t('cand.profile.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>{t('cand.fullName')}</label>
            <input className={field} value={form.nom_complet} onChange={(e) => set('nom_complet', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t('cand.phone')}</label>
            <input className={field} value={form.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="06 XX XX XX XX" />
          </div>
          <div>
            <label className={label}>{t('cand.city')}</label>
            <select className={field} value={form.ville} onChange={(e) => set('ville', e.target.value)}>
              <option value="">—</option>
              {SOUSS_MASSA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>{t('cand.quartier')}</label>
            <input className={field} value={form.quartier} onChange={(e) => set('quartier', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t('cand.profile.poste')}</label>
            <input className={field} value={form.poste_recherche} onChange={(e) => set('poste_recherche', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t('cand.profile.experience')}</label>
            <input className={field} type="number" min={0} max={50} value={form.experience_years}
              onChange={(e) => set('experience_years', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t('cand.profile.niveau')}</label>
            <select className={field} value={form.niveau_etudes} onChange={(e) => set('niveau_etudes', e.target.value)}>
              <option value="">—</option>
              {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>{t('cand.profile.diplome')}</label>
            <input className={field} value={form.diplome} onChange={(e) => set('diplome', e.target.value)} />
          </div>
          <div>
            <label className={label}>{t('cand.profile.dispo')}</label>
            <select className={field} value={form.disponibilite} onChange={(e) => set('disponibilite', e.target.value)}>
              <option value="">—</option>
              {DISPONIBILITES.map((d) => <option key={d} value={d}>{t(`cand.dispo.${d}`)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={label}>{t('cand.profile.competences')}</label>
          <input className={field} value={form.competences} onChange={(e) => set('competences', e.target.value)}
            placeholder={t('cand.profile.competencesHint')} />
        </div>
        <div>
          <label className={label}>{t('cand.profile.langues')}</label>
          <input className={field} value={form.langues} onChange={(e) => set('langues', e.target.value)}
            placeholder={t('cand.profile.competencesHint')} />
        </div>

        <div>
          <span className={label}>{t('cand.profile.contracts')}</span>
          <div className="flex flex-wrap gap-2">
            {CONTRACTS.map((c) => (
              <Chip key={c} active={form.contrats_souhaites.includes(c)} onClick={() => toggle('contrats_souhaites', c)} label={c} />
            ))}
          </div>
        </div>
        <div>
          <span className={label}>{t('cand.profile.cities')}</span>
          <div className="flex flex-wrap gap-2">
            {SOUSS_MASSA_CITIES.map((c) => (
              <Chip key={c} active={form.villes_souhaitees.includes(c)} onClick={() => toggle('villes_souhaitees', c)} label={c} />
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 disabled:opacity-60">
          {saving ? t('cand.profile.saving') : t('cand.profile.save')}
        </button>
      </section>
    </div>
  );
};

const Chip: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button type="button" onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
      active ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
    }`}>
    {label}
  </button>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; title: string; help: string }> = ({ checked, onChange, title, help }) => (
  <label className="flex items-start gap-4 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-5 w-5 accent-orange-500 shrink-0" />
    <span>
      <span className="block font-semibold text-gray-900">{title}</span>
      <span className="block text-sm text-gray-500">{help}</span>
    </span>
  </label>
);

// ---------------------------------------------------------------------------
const STATUS_STYLE: Record<string, string> = {
  nouvelle: 'bg-blue-50 text-blue-700 border-blue-200',
  vue: 'bg-gray-100 text-gray-700 border-gray-200',
  preselection: 'bg-amber-50 text-amber-700 border-amber-200',
  entretien: 'bg-purple-50 text-purple-700 border-purple-200',
  acceptee: 'bg-green-50 text-green-700 border-green-200',
  refusee: 'bg-red-50 text-red-700 border-red-200',
};

const ApplicationsTab: React.FC<{ apps: MyCandidature[]; lang: string }> = ({ apps, lang }) => {
  const { t } = useT();
  const fmt = useMemo(
    () => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium' }),
    [lang],
  );

  if (apps.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
        <p className="text-gray-500 mb-4">{t('cand.apps.empty')}</p>
        <Link to="/offres" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600">
          {t('cand.apps.emptyCta')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{t('cand.apps.count', { n: apps.length })} — {t('cand.apps.note')}</p>
      {apps.map((a) => {
        const key = candidatureStatusKey(a.status || 'nouvelle');
        return (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{a.job_title}</div>
              <div className="text-sm text-gray-500 truncate">
                {a.company_name} · {fmt.format(new Date(a.created_at))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[key] || STATUS_STYLE.nouvelle}`}>
                {t(`company.cand.${key}`)}
              </span>
              {a.slug
                ? <Link to={`/emploi/${a.slug}`} className="text-sm text-blue-600 font-medium hover:underline">{t('cand.apps.viewOffer')}</Link>
                : <span className="text-sm text-gray-400">{t('cand.apps.offerClosed')}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
const AlertsTab: React.FC<{ profile: CandidateProfile; alerts: JobAlert[]; onChange: () => Promise<void> }> = ({ profile, alerts, onChange }) => {
  const { t } = useT();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ intitule: '', ville: '', type_contrat: '', frequence: 'quotidienne' as JobAlert['frequence'] });

  const create = async () => {
    if (!form.intitule.trim() && !form.ville && !form.type_contrat) {
      toast.warning(t('cand.alerts.needCriteria'));
      return;
    }
    if (alerts.length >= MAX_ALERTS) { toast.warning(t('cand.alerts.max')); return; }
    setSaving(true);
    try {
      await alertsService.create(profile.id, {
        intitule: form.intitule.trim() || null,
        ville: form.ville || null,
        type_contrat: form.type_contrat || null,
        frequence: form.frequence,
      });
      setForm({ intitule: '', ville: '', type_contrat: '', frequence: 'quotidienne' });
      await onChange();
      toast.success(t('cand.alerts.created'));
    } catch (e: any) {
      toast.error(e?.message || t('cand.error.generic'));
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none';

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="font-bold text-gray-900">{t('cand.alerts.title')}</h2>
          <p className="text-sm text-gray-500">{t('cand.alerts.help')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.alerts.intitule')}</label>
            <input className={field} value={form.intitule} onChange={(e) => setForm({ ...form, intitule: e.target.value })}
              placeholder={t('cand.alerts.intituleHint')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.alerts.ville')}</label>
            <select className={field} value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })}>
              <option value="">{t('cand.any')}</option>
              {SOUSS_MASSA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.alerts.contrat')}</label>
            <select className={field} value={form.type_contrat} onChange={(e) => setForm({ ...form, type_contrat: e.target.value })}>
              <option value="">{t('cand.any')}</option>
              {CONTRACTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.alerts.frequence')}</label>
            <select className={field} value={form.frequence}
              onChange={(e) => setForm({ ...form, frequence: e.target.value as JobAlert['frequence'] })}>
              <option value="quotidienne">{t('cand.alerts.daily')}</option>
              <option value="hebdomadaire">{t('cand.alerts.weekly')}</option>
            </select>
          </div>
        </div>
        <button onClick={create} disabled={saving}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 disabled:opacity-60">
          {t('cand.alerts.create')}
        </button>
      </section>

      {alerts.length === 0 ? (
        <p className="text-center text-gray-400 py-6">{t('cand.alerts.empty')}</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900">
                  {[a.intitule, a.ville, a.type_contrat].filter(Boolean).join(' · ') || t('cand.any')}
                </div>
                <div className="text-sm text-gray-500">
                  {a.frequence === 'quotidienne' ? t('cand.alerts.daily') : t('cand.alerts.weekly')}
                  {!a.actif && ` · ${t('cand.alerts.paused')}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => { await alertsService.setActive(a.id, !a.actif); await onChange(); }}
                  className="text-sm text-gray-600 font-medium hover:underline">
                  {a.actif ? t('cand.alerts.pause') : t('cand.alerts.resume')}
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm(t('cand.alerts.deleteConfirm'))) return;
                    await alertsService.remove(a.id);
                    await onChange();
                  }}
                  className="text-sm text-red-600 font-medium hover:underline">
                  {t('cand.alerts.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
const AccountTab: React.FC = () => {
  const { t } = useT();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ password: '', confirm: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.warning(t('cand.error.passwordShort')); return; }
    if (form.password !== form.confirm) { toast.warning(t('cand.error.passwordMismatch')); return; }
    setSaving(true);
    try {
      await candidateAuth.changePassword(form.password);
      setForm({ password: '', confirm: '' });
      toast.success(t('cand.account.success'));
    } catch (err: any) {
      toast.error(err?.message || t('cand.error.generic'));
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none';

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 max-w-md">
      <h2 className="font-bold text-gray-900">{t('cand.account.title')}</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.account.newPassword')}</label>
        <input className={field} type="password" minLength={8} value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('cand.account.confirm')}</label>
        <input className={field} type="password" minLength={8} value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      </div>
      <button type="submit" disabled={saving}
        className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 disabled:opacity-60">
        {saving ? t('cand.account.saving') : t('cand.account.submit')}
      </button>
    </form>
  );
};

export default CandidateDashboard;
