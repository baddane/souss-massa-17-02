import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../src/i18n/LanguageContext';

// Diagrammes 100% SVG, sans dépendance externe → crawlables (SEO) et légers.
// Alimentés par des specs JSON (produites par la routine éditoriale).
//
// Deux règles structurelles, valables pour TOUS les articles (présents et à venir) :
//  1. le diagramme ne se comprime jamais : il garde une largeur minimale et
//     défile horizontalement sur mobile plutôt que d'écraser les libellés ;
//  2. chaque diagramme est agrandissable en plein écran, avec zoom.

export interface ChartSpec {
  type: 'bar' | 'line' | 'donut';
  title?: string;
  unit?: string;                 // ex: '%'
  source?: string;
  series: { label: string; value: number }[];
}

const PALETTE = ['#2563eb', '#f97316', '#16a34a', '#9333ea', '#0891b2', '#dc2626', '#ca8a04', '#4f46e5'];

// Convention française : virgule décimale et espace fine avant l'unité
// (« 67,3 % », « 177 000 »), sinon les chiffres sonnent anglophones.
const NF = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const fmt = (n: number) => NF.format(n);

// Une unité courte ('%') se colle à la valeur ; une unité longue ('DH/mois',
// 'milliers') donnerait « 3266DH/mois » sur chaque barre : on la sort en légende.
const isShortUnit = (u?: string) => !!u && u.trim().length <= 2;
const inlineUnit = (u?: string) => (isShortUnit(u) ? '\u202f' + (u as string).trim() : '');
// Une unité longue est annoncée une fois sous le titre : « en milliers ».
const captionUnit = (u?: string) => (u && !isShortUnit(u) ? `en ${u.trim()}` : '');

// Découpe un libellé long en 2 lignes (au lieu de tronquer) pour rester lisible.
// Un mot trop long sans espace (« Admin/Finance ») déborderait sur la barre
// voisine : on le coupe alors sur son séparateur interne.
function splitLongWord(w: string, max: number): string[] {
  const i = Math.max(w.lastIndexOf('/', max), w.lastIndexOf('-', max), w.lastIndexOf('–', max));
  return i > 2 ? [w.slice(0, i + 1), w.slice(i + 1)] : [w.slice(0, max), w.slice(max)];
}

function wrapLabel(s: string, max = 12): string[] {
  if (s.length <= max) return [s];
  const parts: string[] = [];
  for (const w of s.split(/\s+/)) parts.push(...(w.length > max ? splitLongWord(w, max) : [w]));
  const join = (line: string, w: string) => (/[\/\-–]$/.test(line) ? line + w : `${line} ${w}`);
  let l1 = '', l2 = '';
  for (const w of parts) {
    if (l2 === '' && (l1 ? join(l1, w) : w).length <= max) l1 = l1 ? join(l1, w) : w;
    else l2 = l2 ? join(l2, w) : w;
  }
  if (!l2) return [l1];
  if (l2.length > max + 3) l2 = l2.slice(0, max + 2) + '…';
  return [l1, l2];
}

// Largeur du dessin : elle grandit avec le nombre de séries, pour que chaque
// barre garde de la place. C'est cette largeur qui déclenche le défilement.
// Le plancher (520) n'est pas décoratif : en dessous, le SVG est réduit par le
// navigateur et le texte des libellés tombe sous 9 px, illisible sur mobile.
const canvasWidth = (n: number, per = 66, min = 520) => Math.max(min, n * per);

const BarChart: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const data = spec.series;
  const w = canvasWidth(data.length), h = 300, padL = 52, padB = 56, padT = 22, padR = 16;
  const vals = data.map(d => d.value);
  // Un axe qui part de zéro : sans cela une valeur négative (ex. destructions
  // nettes d'emploi) donnait une hauteur négative, donc une barre invisible.
  const max = Math.max(0, ...vals);
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const iw = w - padL - padR, ih = h - padT - padB;
  const bw = iw / data.length;
  const y0 = padT + ih - ((0 - min) / span) * ih;   // ligne du zéro
  const ticks = 4;
  const u = inlineUnit(spec.unit);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={spec.title || 'Diagramme'}>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = padT + (ih * i) / ticks;
        const val = max - (span * i) / ticks;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#9ca3af">{fmt(val)}</text>
          </g>
        );
      })}
      {min < 0 && <line x1={padL} y1={y0} x2={w - padR} y2={y0} stroke="#9ca3af" strokeWidth={1.5} />}
      {data.map((d, i) => {
        const yv = padT + ih - ((d.value - min) / span) * ih;
        const bh = Math.abs(yv - y0);
        const x = padL + i * bw + bw * 0.15;
        const top = Math.min(yv, y0);
        const neg = d.value < 0;
        return (
          <g key={i}>
            <rect x={x} y={top} width={bw * 0.7} height={Math.max(1, bh)} rx={4} fill={PALETTE[i % PALETTE.length]} />
            <text x={x + bw * 0.35} y={neg ? y0 + 15 : top - 6} textAnchor="middle" fontSize={11} fontWeight={700}
              fill={neg ? '#ffffff' : '#374151'}>
              {fmt(d.value)}{u}
            </text>
            <text x={x + bw * 0.35} y={h - padB + 16} textAnchor="middle" fontSize={11} fill="#6b7280">
              {wrapLabel(d.label).map((ln, li) => (
                <tspan key={li} x={x + bw * 0.35} dy={li === 0 ? 0 : 12}>{ln}</tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const LineChart: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const data = spec.series;
  const w = canvasWidth(data.length, 64), h = 300, padL = 52, padB = 44, padT = 22, padR = 16;
  const max = Math.max(1, ...data.map(d => d.value));
  const min = Math.min(0, ...data.map(d => d.value));
  const iw = w - padL - padR, ih = h - padT - padB;
  const x = (i: number) => padL + (iw * i) / Math.max(1, data.length - 1);
  const y = (v: number) => padT + ih - ((v - min) / (max - min || 1)) * ih;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.value)}`).join(' ');
  const u = inlineUnit(spec.unit);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={spec.title || 'Courbe'}>
      {[0, 1, 2, 3, 4].map(i => {
        const yy = padT + (ih * i) / 4;
        return <line key={i} x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#e5e7eb" strokeWidth={1} />;
      })}
      <path d={path} fill="none" stroke={PALETTE[0]} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r={3.5} fill={PALETTE[0]} />
          <text x={x(i)} y={y(d.value) - 9} textAnchor="middle" fontSize={10} fontWeight={700} fill="#374151">
            {fmt(d.value)}{u}
          </text>
          <text x={x(i)} y={h - padB + 16} textAnchor="middle" fontSize={11} fill="#6b7280">
            {d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

const DonutChart: React.FC<{ spec: ChartSpec; large?: boolean }> = ({ spec, large }) => {
  const size = 240, cx = 120, cy = 120, r = 88, sw = 34;
  const total = spec.series.reduce((s, d) => s + d.value, 0) || 1;
  const C = 2 * Math.PI * r;
  const u = inlineUnit(spec.unit);
  let offset = 0;
  return (
    <div className={`flex flex-col ${large ? 'lg:flex-row' : 'sm:flex-row'} items-center gap-6`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0"
        role="img" aria-label={spec.title || 'Répartition'}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
        {spec.series.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={PALETTE[i % PALETTE.length]} strokeWidth={sw}
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} />
          );
          offset += dash;
          return el;
        })}
        {spec.unit?.trim() !== '%' && (
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16} fontWeight={800} fill="#111827">
            {fmt(total)}{u}
          </text>
        )}
      </svg>
      <ul className="text-sm space-y-1.5">
        {spec.series.map((d, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="w-3 h-3 rounded-sm inline-block mt-1 shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-gray-700">{d.label}</span>
            <span className="text-gray-400 whitespace-nowrap">— {fmt(d.value)}{u} ({Math.round((d.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Canvas: React.FC<{ spec: ChartSpec; large?: boolean }> = ({ spec, large }) =>
  spec.type === 'line' ? <LineChart spec={spec} />
    : spec.type === 'donut' ? <DonutChart spec={spec} large={large} />
    : <BarChart spec={spec} />;

// Le donut se lit déjà en entier ; seuls les diagrammes « larges » ont besoin
// d'une largeur minimale qui force le défilement horizontal.
const minCanvas = (spec: ChartSpec) =>
  spec.type === 'donut' ? undefined : canvasWidth(spec.series.length, spec.type === 'line' ? 64 : 66);

const ZoomModal: React.FC<{ spec: ChartSpec; onClose: () => void }> = ({ spec, onClose }) => {
  const { t } = useT();
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const base = minCanvas(spec);
  const btn = 'w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg leading-none disabled:opacity-40';

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-2 sm:p-6"
      role="dialog" aria-modal="true" aria-label={spec.title || t('obs.chart.zoom')} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-full flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-gray-200">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">{spec.title}</h3>
            {captionUnit(spec.unit) && <p className="text-xs text-gray-500 mt-0.5">{captionUnit(spec.unit)}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t('obs.chart.close')}
            className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-white" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div style={base ? { width: `${100 * zoom}%`, minWidth: base * zoom } : { width: `${100 * zoom}%` }}>
            <Canvas spec={spec} large />
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 border-t border-gray-200 bg-gray-50">
          <button type="button" className={btn} onClick={() => setZoom(z => Math.max(1, +(z - 0.5).toFixed(1)))}
            disabled={zoom <= 1} aria-label={t('obs.chart.zoomOut')}>−</button>
          <button type="button" className={btn} onClick={() => setZoom(z => Math.min(4, +(z + 0.5).toFixed(1)))}
            disabled={zoom >= 4} aria-label={t('obs.chart.zoomIn')}>+</button>
          <span className="text-xs text-gray-500 tabular-nums w-12">{Math.round(zoom * 100)}%</span>
          <span className="text-xs text-gray-400 flex-1 text-end">{t('obs.chart.hint')}</span>
        </div>

        {spec.source && <p className="text-xs text-gray-400 px-4 pb-3">Source : {spec.source}</p>}
      </div>
    </div>,
    document.body,
  );
};

const ObsChart: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const base = useMemo(() => minCanvas(spec), [spec]);

  if (!spec || !Array.isArray(spec.series) || spec.series.length === 0) return null;

  return (
    <figure className="my-8 bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <figcaption className="flex-1">
          {spec.title && <span className="font-bold text-gray-900 block">{spec.title}</span>}
          {captionUnit(spec.unit) && <span className="text-xs font-normal text-gray-500 block mt-0.5">{captionUnit(spec.unit)}</span>}
        </figcaption>
        <button type="button" onClick={() => setOpen(true)} title={t('obs.chart.zoom')}
          aria-label={t('obs.chart.zoom')}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          <span className="hidden sm:inline">{t('obs.chart.zoom')}</span>
        </button>
      </div>

      <div className="overflow-x-auto -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div style={base ? { minWidth: base } : undefined}>
          <Canvas spec={spec} />
        </div>
      </div>

      {spec.source && <p className="text-xs text-gray-400 mt-3">Source : {spec.source}</p>}
      {open && <ZoomModal spec={spec} onClose={close} />}
    </figure>
  );
};

export default ObsChart;
