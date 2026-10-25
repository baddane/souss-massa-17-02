import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';

// Simulateur brut → net (Maroc). Paramètres de paie 2025 (barème IR mensuel).
// Estimation : hors CIMR, mutuelle facultative et éléments non imposables.

// Barème IR mensuel 2025 (taux / somme à déduire).
const BAREME = [
  { max: 3333.33, taux: 0, ded: 0 },
  { max: 5000, taux: 0.10, ded: 333.33 },
  { max: 6666.67, taux: 0.20, ded: 833.33 },
  { max: 8333.33, taux: 0.30, ded: 1500 },
  { max: 15000, taux: 0.34, ded: 1833.33 },
  { max: Infinity, taux: 0.37, ded: 2283.33 },
];
const CNSS_TAUX = 0.0448, CNSS_PLAFOND = 6000;        // part salariale, plafonnée
const AMO_TAUX = 0.0226;                               // part salariale, non plafonnée
const FRAIS_PLAFOND = 2916.67;                         // 35 000 / an
const CHARGE_FAMILLE = 500 / 12;                       // 500 DH/an par personne (LF 2025), max 6

const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' DH';

function calcule(brut: number, personnes: number) {
  const cnss = Math.min(brut, CNSS_PLAFOND) * CNSS_TAUX;
  const amo = brut * AMO_TAUX;
  const tauxFrais = brut <= 6500 ? 0.35 : 0.25;
  const frais = Math.min(brut * tauxFrais, FRAIS_PLAFOND);
  const sni = Math.max(0, brut - cnss - amo - frais);      // salaire net imposable
  const tranche = BAREME.find((t) => sni <= t.max) || BAREME[BAREME.length - 1];
  const irBrut = Math.max(0, sni * tranche.taux - tranche.ded);
  const reductionFamille = Math.min(personnes, 6) * CHARGE_FAMILLE;
  const ir = Math.max(0, irBrut - reductionFamille);
  const net = brut - cnss - amo - ir;
  return { cnss, amo, frais, sni, tranche, ir, net };
}

const SalaireNet: React.FC = () => {
  const [brutStr, setBrutStr] = useState('6000');
  const [personnes, setPersonnes] = useState(0);
  const brut = Math.max(0, Number(brutStr.replace(/[^0-9.]/g, '')) || 0);
  const r = useMemo(() => calcule(brut, personnes), [brut, personnes]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Comment calculer le salaire net au Maroc ?', acceptedAnswer: { '@type': 'Answer', text: 'On déduit du salaire brut la CNSS (4,48 % plafonnée à 6 000 DH), l’AMO (2,26 %) et l’impôt sur le revenu (IR) calculé sur le salaire net imposable selon le barème mensuel 2025.' } },
      { '@type': 'Question', name: 'Quel est le taux de la CNSS pour le salarié ?', acceptedAnswer: { '@type': 'Answer', text: 'La part salariale CNSS est de 4,48 % du salaire brut, plafonnée à un salaire de 6 000 DH, soit 268,80 DH maximum par mois. L’AMO ajoute 2,26 % sans plafond.' } },
    ],
  };

  const Row: React.FC<{ k: string; v: string; strong?: boolean; sub?: string }> = ({ k, v, strong, sub }) => (
    <div className={`flex justify-between items-baseline py-2 ${strong ? '' : 'border-b border-gray-100'}`}>
      <span className={strong ? 'font-black text-gray-900' : 'text-gray-600'}>{k}{sub && <span className="block text-[11px] text-gray-400">{sub}</span>}</span>
      <span className={strong ? 'font-black text-lg' : 'font-semibold text-gray-800'}>{v}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SEO
        title="Calcul du salaire net au Maroc (2025) — simulateur brut en net"
        description="Simulateur gratuit du salaire net au Maroc : convertissez votre salaire brut en net (CNSS, AMO, IR barème 2025, frais professionnels). Calcul instantané, sans inscription."
        canonical="/outils/salaire-net"
        jsonLd={jsonLd}
      />
      <nav className="text-sm text-gray-400 mb-4">
        <Link to="/outils" className="hover:text-blue-600">Outils</Link><span className="mx-2">/</span><span>Salaire net au Maroc</span>
      </nav>

      <h1 className="text-3xl font-black text-gray-900 mb-2">Calcul du salaire net au Maroc</h1>
      <p className="text-gray-600 mb-6">Convertissez un salaire <strong>brut</strong> en <strong>net</strong> selon la paie marocaine 2025 (CNSS, AMO, IR, frais professionnels).</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="block text-sm font-semibold text-gray-600">Salaire brut mensuel (DH)
          <input inputMode="numeric" value={brutStr} onChange={(e) => setBrutStr(e.target.value)}
            className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
        </label>
        <label className="block text-sm font-semibold text-gray-600">Personnes à charge
          <select value={personnes} onChange={(e) => setPersonnes(Number(e.target.value))}
            className="mt-1 w-full px-4 py-3 border border-gray-300 rounded-xl text-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-5">
        <Row k="Salaire brut" v={fmt(brut)} />
        <Row k="CNSS (4,48 %)" sub="plafonnée à 6 000 DH" v={'− ' + fmt(r.cnss)} />
        <Row k="AMO (2,26 %)" v={'− ' + fmt(r.amo)} />
        <Row k="Impôt sur le revenu (IR)" sub={`tranche ${Math.round(r.tranche.taux * 100)} %`} v={'− ' + fmt(r.ir)} />
        <div className="mt-3 pt-3 border-t-2 border-gray-900">
          <Row k="Salaire net mensuel" v={fmt(r.net)} strong />
        </div>
        <p className="text-xs text-gray-400 mt-2">Salaire net imposable retenu : {fmt(r.sni)} · frais professionnels déduits : {fmt(r.frais)}</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mt-5 text-sm text-gray-700">
        <p className="font-bold text-gray-900 mb-1">ℹ️ Paramètres utilisés (2025)</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>CNSS part salariale : 4,48 % (plafond de salaire 6 000 DH).</li>
          <li>AMO part salariale : 2,26 % (sans plafond).</li>
          <li>Frais professionnels : 35 % du brut si ≤ 6 500 DH, sinon 25 %, plafonnés à 2 916,67 DH/mois.</li>
          <li>IR : barème mensuel 2025 (0 % jusqu’à 3 333 DH, puis 10/20/30/34/37 %).</li>
          <li>Réduction pour charges de famille : 500 DH/an par personne (max 6).</li>
        </ul>
        <p className="mt-2 text-gray-500">
          Estimation indicative : hors CIMR, mutuelle facultative, primes non imposables et cas particuliers.
          Pour un calcul officiel, référez-vous à la CNSS et à la DGI.
        </p>
      </div>

      <div className="mt-6 text-center">
        <Link to="/outils" className="text-blue-600 font-semibold hover:underline">← Tous les outils</Link>
      </div>
    </div>
  );
};

export default SalaireNet;
