import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabaseOffers } from '../src/services/supabase';
import { useT } from '../src/i18n/LanguageContext';
import { candidateAuth, candidateService, type CandidateProfile } from '../src/services/candidateService';
import { INSCRIPTION_CANDIDAT_OUVERTE } from '../src/config/features';
import { EmailAlreadyRegisteredError } from '../src/services/companyService';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  jobRef: string;
  companyName: string;
}

const MAX_CV_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const ApplyModal: React.FC<ApplyModalProps> = ({ isOpen, onClose, jobTitle, jobRef, companyName }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [cvFile, setCvFile] = useState<File | null>(null);
  // Consentement CVtheque : coche par defaut (comportement historique) mais
  // desormais decochable, et respecte cote base (migration 024).
  const [consent, setConsent] = useState(true);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  // Ce que le candidat vient de deposer. Le formulaire de candidature collecte
  // deja NOM, EMAIL, TELEPHONE et CV — c'est-a-dire tous les champs du profil.
  // Plutot que de lui demander de tout ressaisir dans un formulaire
  // d'inscription qu'il ne trouvera probablement jamais, on lui propose de
  // transformer sa candidature en compte : il ne reste qu'un mot de passe.
  const [applied, setApplied] = useState<{ name: string; email: string; phone: string; cvPath: string; cvName: string } | null>(null);
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const { t } = useT();
  const navigate = useNavigate();

  // Candidature en un clic : si le visiteur est connecte a son espace candidat,
  // on reprend ses coordonnees et son CV deja deposé.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const user = await candidateAuth.currentUser();
        if (!user || cancelled) return;
        const p = await candidateService.getProfile(user.id);
        if (!p || cancelled) return;
        setProfile(p);
        setForm({ name: p.nom_complet || '', email: p.email || '', phone: p.telephone || '' });
        setConsent(p.visible_recruteurs);
      } catch {
        /* visiteur anonyme : formulaire vierge, comportement inchange */
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t('apply.formatError'));
      return;
    }
    if (file.size > MAX_CV_SIZE) {
      toast.error(t('apply.sizeError'));
      return;
    }
    setCvFile(file);
  };

  // Reutilise le CV de l'espace candidat : on le recopie sous la reference de
  // l'offre, comme un depot classique. L'entreprise n'a ainsi acces qu'au
  // fichier depose sur SON offre (cloisonnement par `ref_offre`, migration 014).
  const copyProfileCv = async (): Promise<{ path: string; name: string }> => {
    if (!profile?.cv_path) throw new Error('NO_CV');
    const url = await candidateService.cvUrl(profile.cv_path);
    if (!url) throw new Error('NO_CV');
    const res = await fetch(url);
    if (!res.ok) throw new Error('NO_CV');
    const blob = await res.blob();
    const ext = (profile.cv_filename || 'cv.pdf').split('.').pop();
    const path = `${jobRef}/${Date.now()}-${(profile.nom_complet || 'candidat').replace(/\s+/g, '_')}.${ext}`;
    const { error } = await supabaseOffers.storage.from('cvs').upload(path, blob, {
      contentType: blob.type || 'application/pdf',
    });
    if (error) throw error;
    return { path, name: profile.cv_filename || `cv.${ext}` };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.warning(t('apply.nameEmailRequired'));
      return;
    }
    if (!cvFile && !profile?.cv_path) {
      toast.warning(t('apply.cvRequired'));
      return;
    }

    setSending(true);
    try {
      let filePath: string;
      let fileName: string;

      if (cvFile) {
        const ext = cvFile.name.split('.').pop();
        filePath = `${jobRef}/${Date.now()}-${form.name.replace(/\s+/g, '_')}.${ext}`;
        const { error: uploadError } = await supabaseOffers.storage.from('cvs').upload(filePath, cvFile);
        if (uploadError) throw uploadError;
        fileName = cvFile.name;
      } else {
        const copied = await copyProfileCv();
        filePath = copied.path;
        fileName = copied.name;
      }

      // L'id est genere ici plutot que relu apres insertion : le visiteur anonyme
      // n'a que le droit d'ecrire sur `candidatures`, un `.select()` de retour
      // echouerait sur la RLS et ferait echouer la candidature entiere.
      const candidatureId = crypto.randomUUID();

      // Bucket prive : on stocke le chemin (cv_path), l'admin genere une URL signee.
      const { error: insertError } = await supabaseOffers
        .from('candidatures')
        .insert({
          id: candidatureId,
          job_ref: jobRef,
          job_title: jobTitle,
          company_name: companyName,
          candidate_name: form.name,
          candidate_email: form.email,
          candidate_phone: form.phone || null,
          cv_path: filePath,
          cv_filename: fileName,
          consent_cvtheque: consent,
        });

      if (insertError) throw insertError;

      // Prevenir l'entreprise. Best-effort : la candidature est deja enregistree,
      // un echec d'email ne doit pas la faire echouer aux yeux du candidat.
      fetch('/api/notify-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidatureId }),
      }).catch(() => { /* silencieux */ });

      toast.success(t('apply.sentSuccess'));
      setCvFile(null);

      if (profile) {
        // Deja connecte : rien a proposer, on referme comme avant.
        setForm({ name: '', email: '', phone: '' });
        onClose();
      } else {
        setApplied({ name: form.name, email: form.email, phone: form.phone, cvPath: filePath, cvName: fileName });
      }
    } catch (err: any) {
      console.error('Erreur candidature:', err);
      toast.error(err?.message === 'NO_CV' ? t('apply.cvRequired') : (err?.message || t('apply.sendError')));
    } finally {
      setSending(false);
    }
  };

  // Un seul champ, aucune ressaisie : le compte reprend les informations et le
  // CV de la candidature qui vient d'etre enregistree, et le candidat est
  // connecte dans la foulee.
  const createSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applied) return;
    if (password.length < 8) { toast.warning(t('cand.error.passwordShort')); return; }
    setCreating(true);
    try {
      const userId = await candidateAuth.signUp(applied.email, password, applied.name, consent);
      await candidateService.updateProfile(userId, {
        telephone: applied.phone || null,
        cv_path: applied.cvPath,
        cv_filename: applied.cvName,
      });
      toast.success(t('apply.spaceCreated'));
      onClose();
      navigate('/espace-candidat');
    } catch (err: any) {
      if (err instanceof EmailAlreadyRegisteredError) toast.info(t('apply.alreadyHasSpace'));
      else toast.error(err?.message || t('cand.error.generic'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{applied ? t('apply.successTitle') : t('apply.title')}</h2>
            <p className="text-sm text-gray-500 mt-1">{jobTitle} — {companyName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {applied ? (
        /* Le depot est enregistre. Le panneau de creation de compte n'est
           propose que si les inscriptions sont ouvertes : tant qu'elles sont
           fermees, on confirme et on s'arrete la — la candidature et son CV
           sont deja enregistres, demander autre chose serait une barriere. */
        <div className="space-y-5">
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            {t('apply.successText', { company: companyName })}
          </p>

          {INSCRIPTION_CANDIDAT_OUVERTE && (
          <div className="border border-orange-200 bg-orange-50/60 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-gray-900">{t('apply.createSpaceTitle')}</h3>
            <p className="text-sm text-gray-600">{t('apply.createSpaceText')}</p>

            <div className="text-sm text-gray-500 space-y-1">
              <div className="truncate">✓ {applied.name} — {applied.email}</div>
              <div className="truncate">✓ {applied.cvName}</div>
            </div>

            <form onSubmit={createSpace} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('apply.choosePassword')}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">{t('cand.passwordHint')}</p>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-60"
              >
                {creating ? t('apply.creating') : t('apply.createSpaceCta')}
              </button>
            </form>
          </div>
          )}

          <button onClick={onClose}
            className={INSCRIPTION_CANDIDAT_OUVERTE
              ? 'w-full text-sm text-gray-500 hover:text-gray-800 underline'
              : 'w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors'}>
            {INSCRIPTION_CANDIDAT_OUVERTE ? t('apply.noThanks') : t('apply.close')}
          </button>
        </div>
        ) : (
        <>
        {profile && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
            {t('apply.prefilled')}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('apply.fullName')} *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('apply.yourName')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('apply.email')} *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="votre@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('apply.phone')}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="06 XX XX XX XX"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('apply.cvLabel')} *</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
            >
              {cvFile ? (
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <span className="font-medium text-sm">{cvFile.name}</span>
                  <span className="text-xs text-gray-400">({(cvFile.size / 1024 / 1024).toFixed(1)} Mo)</span>
                </div>
              ) : profile?.cv_path ? (
                <div className="text-sm">
                  <span className="font-medium text-green-700">{profile.cv_filename || 'CV'}</span>
                  <span className="block text-xs text-gray-400 mt-1">{t('apply.cvHint')}</span>
                </div>
              ) : (
                <span className="text-gray-400 text-sm">{t('apply.cvHint')}</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-blue-600"
            />
            <span>
              {t('apply.consent')}
              <span className="block text-xs text-gray-400 mt-0.5">{t('apply.consentHelp')}</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {sending ? t('apply.sending') : t('apply.submit')}
          </button>
        </form>

        {!profile && INSCRIPTION_CANDIDAT_OUVERTE && (
          <p className="text-center text-sm">
            <Link to="/inscription-candidat" className="text-blue-600 font-medium hover:underline">
              {t('apply.createAccount')}
            </Link>
          </p>
        )}

        <p className="text-xs text-gray-400 text-center">
          {t('apply.privacyNote')}
        </p>
        </>
        )}
      </div>
    </div>
  );
};

export default ApplyModal;
