import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  jobRef: string;
  companyName: string;
}

const RECIPIENT_EMAIL = 'r.baddane@gmail.com';
const MAX_CV_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const ApplyModal: React.FC<ApplyModalProps> = ({ isOpen, onClose, jobTitle, jobRef, companyName }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [cvFile, setCvFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Format accepté : PDF ou Word (.doc, .docx)');
      return;
    }
    if (file.size > MAX_CV_SIZE) {
      toast.error('Le CV ne doit pas dépasser 5 Mo');
      return;
    }
    setCvFile(file);
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const openMailtoFallback = () => {
    const subject = encodeURIComponent(`Candidature : ${jobTitle} (Réf: ${jobRef})`);
    const body = encodeURIComponent(
      `Bonjour,\n\nJe souhaite postuler au poste de ${jobTitle} chez ${companyName} (Réf: ${jobRef}).\n\n` +
      `Nom : ${form.name}\nEmail : ${form.email}\nTéléphone : ${form.phone || 'Non renseigné'}\n\n` +
      `Merci de trouver mon CV en pièce jointe.\n\nCordialement,\n${form.name}`
    );
    window.open(`mailto:${RECIPIENT_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.warning('Nom et email sont requis.');
      return;
    }
    if (!cvFile) {
      toast.warning('Veuillez joindre votre CV.');
      return;
    }

    setSending(true);
    try {
      const cvBase64 = await toBase64(cvFile);
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: form.name,
          candidateEmail: form.email,
          candidatePhone: form.phone,
          jobTitle,
          jobRef,
          cvBase64,
          cvFileName: cvFile.name,
        }),
      });

      if (!res.ok) {
        throw new Error('server');
      }

      toast.success('Candidature envoyée avec succès !');
      onClose();
    } catch {
      openMailtoFallback();
      toast.info('Votre messagerie va s\'ouvrir — joignez votre CV et envoyez le mail.');
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Postuler</h2>
            <p className="text-sm text-gray-500 mt-1">{jobTitle} — {companyName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Votre nom"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="06 XX XX XX XX"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CV (PDF ou Word) *</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
            >
              {cvFile ? (
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <span className="font-medium text-sm">{cvFile.name}</span>
                  <span className="text-xs text-gray-400">({(cvFile.size / 1024 / 1024).toFixed(1)} Mo)</span>
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Cliquez pour joindre votre CV</span>
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

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {sending ? 'Envoi en cours...' : 'Envoyer ma candidature'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center">
          Votre CV sera envoyé directement au recruteur.
        </p>
      </div>
    </div>
  );
};

export default ApplyModal;
