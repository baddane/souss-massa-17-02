import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cvthequeService, CvthequeRow, CvthequeFilters } from '../src/services/cvthequeService';
import { useT } from '../src/i18n/LanguageContext';

// Explorateur de CVthèque en deux volets : liste filtrable à gauche, fiche
// détaillée + aperçu du CV à droite.
//
// Composant PARTAGÉ entre l'espace entreprise et l'admin, pour qu'ils affichent
// exactement la même chose. Ce dépôt souffre déjà de deux copies divergentes de
// jobOffersService — on ne recommence pas.
//
// `canManage` (admin) débloque l'édition et la suppression. La sécurité ne
// dépend évidemment pas de ce booléen : la RLS réserve déjà l'écriture à l'admin.

interface Props {
  canManage?: boolean;
  onEdit?: (row: CvthequeRow) => void;
  onDelete?: (row: CvthequeRow) => void;
  reloadKey?: number;
}

const PER_PAGE = 20;

const initials = (name: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || '?';

// Couleur d'avatar stable, dérivée du nom : deux profils gardent la même teinte
// d'une session à l'autre, ce qui aide à les reconnaître dans la liste.
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700',
];
const avatarColor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const CvthequeExplorer: React.FC<Props> = ({ canManage = false, onEdit, onDelete, reloadKey = 0 }) => {
  const { t } = useT();
  const [rows, setRows] = useState<CvthequeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CvthequeRow | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'nom' | 'recent'>('recent');
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvHidden, setCvHidden] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [filters, setFilters] = useState({ q: '', ville: '', poste: '', niveau: '', diplome: '', withCv: false });
  const listRef = useRef<HTMLDivElement>(null);

  const load = async (f: CvthequeFilters = {}) => {
    setLoading(true);
    const data = await cvthequeService.search(f);
    setRows(data);
    setPage(1);
    setSelected(data[0] || null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [reloadKey]);

  const search = (e?: React.FormEvent) => {
    e?.preventDefault();
    load({
      q: filters.q || undefined,
      ville: filters.ville || undefined,
      poste: filters.poste || undefined,
      niveau: filters.niveau || undefined,
      diplome: filters.diplome || undefined,
    });
  };

  const reset = () => {
    setFilters({ q: '', ville: '', poste: '', niveau: '', diplome: '', withCv: false });
    load();
  };

  // Charge l'aperçu du CV du profil sélectionné (URL signée, bucket privé).
  useEffect(() => {
    let cancelled = false;
    setCvUrl(null);
    setZoom(100);
    if (!selected?.file_path) return;
    setCvLoading(true);
    cvthequeService.signedUrl(selected.file_path, selected.bucket).then((url) => {
      if (!cancelled) { setCvUrl(url); setCvLoading(false); }
    });
    return () => { cancelled = true; };
  }, [selected?.id]);

  const visible = useMemo(() => {
    const list = filters.withCv ? rows.filter((r) => !!r.file_path) : rows;
    const sorted = [...list].sort((a, b) =>
      sort === 'nom'
        ? (a.nom_complet || '').localeCompare(b.nom_complet || '', 'fr')
        : (b.created_at || '').localeCompare(a.created_at || ''),
    );
    return sorted;
  }, [rows, sort, filters.withCv]);

  const pages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const pageSafe = Math.min(page, pages);
  const paged = visible.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE);

  const isPdf = (r: CvthequeRow | null) =>
    !!r && ((r.file_type || '').toLowerCase().includes('pdf') || (r.file_path || '').toLowerCase().endsWith('.pdf'));
  const isImage = (r: CvthequeRow | null) =>
    !!r && /\.(png|jpe?g|webp|gif)$/i.test(r.file_path || '');

  const selectRow = (r: CvthequeRow) => {
    setSelected(r);
    setCvHidden(false);
    if (window.innerWidth < 1024) {
      setTimeout(() => document.getElementById('cv-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  return (
    <div>
      {/* Barre de recherche + filtres */}
      <form onSubmit={search} className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="search" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder={t('cvt.searchPlaceholder')}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
          <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
            {t('cvt.search')}
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <input type="text" value={filters.ville} onChange={(e) => setFilters({ ...filters, ville: e.target.value })}
            placeholder={t('cvt.place')}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="text" value={filters.poste} onChange={(e) => setFilters({ ...filters, poste: e.target.value })}
            placeholder={t('cvt.job')}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="text" value={filters.niveau} onChange={(e) => setFilters({ ...filters, niveau: e.target.value })}
            placeholder={t('cvt.level')}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="text" value={filters.diplome} onChange={(e) => setFilters({ ...filters, diplome: e.target.value })}
            placeholder={t('cvt.school')}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={filters.withCv} onChange={(e) => setFilters({ ...filters, withCv: e.target.checked })}
              className="rounded border-gray-300" />
            {t('cvt.withCv')}
          </label>
          <button type="button" onClick={reset} className="text-sm text-gray-500 hover:text-gray-800 underline">
            {t('cvt.reset')}
          </button>
        </div>
      </form>

      {/* Compteur + tri */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-gray-600 font-medium tabular-nums">
          {loading ? t('cvt.loading') : t('cvt.count', { count: visible.length })}
        </p>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'nom' | 'recent')}
          aria-label={t('cvt.sort')}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="recent">{t('cvt.sortRecent')}</option>
          <option value="nom">{t('cvt.sortName')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
        {/* Volet gauche : liste des profils */}
        <div ref={listRef} className="space-y-2 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pe-1">
          {loading ? (
            <p className="text-gray-500 text-sm bg-white rounded-xl border border-gray-200 p-6 text-center">{t('cvt.loading')}</p>
          ) : paged.length === 0 ? (
            <p className="text-gray-500 text-sm bg-white rounded-xl border border-gray-200 p-6 text-center">{t('cvt.empty')}</p>
          ) : paged.map((r) => {
            const active = selected?.id === r.id;
            return (
              <button key={r.id} onClick={() => selectRow(r)}
                className={`w-full text-start bg-white rounded-xl border p-3 flex gap-3 transition-colors ${
                  active ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <span className={`h-11 w-11 shrink-0 rounded-full grid place-items-center font-bold text-sm ${avatarColor(r.nom_complet || r.email || r.id)}`}>
                  {initials(r.nom_complet)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 truncate">{r.nom_complet || t('cvt.unnamed')}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                      r.file_path ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.file_path ? t('cvt.hasCv') : t('cvt.noCv')}
                    </span>
                  </span>
                  <span className="block text-xs text-gray-500 truncate mt-0.5">
                    {[r.ville, r.niveau_etudes].filter(Boolean).join(' · ') || '—'}
                  </span>
                  <span className="block text-xs text-gray-600 truncate">{r.poste || '—'}</span>
                  {r.diplome && <span className="block text-[11px] text-gray-400 truncate">{r.diplome}</span>}
                </span>
              </button>
            );
          })}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-3">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">‹</button>
              <span className="text-sm text-gray-500 tabular-nums">{pageSafe} / {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={pageSafe >= pages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">›</button>
            </div>
          )}
        </div>

        {/* Volet droit : fiche + aperçu du CV */}
        <div id="cv-detail" className="bg-white rounded-2xl border border-gray-200 p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {!selected ? (
            <p className="text-gray-500 text-sm text-center py-10">{t('cvt.selectProfile')}</p>
          ) : (
            <>
              <div className="flex items-start gap-4 flex-wrap">
                <span className={`h-14 w-14 shrink-0 rounded-full grid place-items-center font-bold ${avatarColor(selected.nom_complet || selected.email || selected.id)}`}>
                  {initials(selected.nom_complet)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-gray-900 truncate">{selected.nom_complet || t('cvt.unnamed')}</h3>
                  <p className="text-sm text-gray-600 truncate">{selected.poste || '—'}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {[selected.ville, selected.quartier, selected.niveau_etudes, selected.diplome].filter(Boolean).join(' · ') || t('cvt.noStructuredData')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selected.telephone && (
                    <a href={`tel:${selected.telephone}`} title={selected.telephone}
                      className="h-10 w-10 grid place-items-center rounded-full bg-blue-600 text-white hover:bg-blue-700" aria-label={t('cvt.call')}>☎</a>
                  )}
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} title={selected.email}
                      className="h-10 w-10 grid place-items-center rounded-full bg-blue-600 text-white hover:bg-blue-700" aria-label={t('cvt.email')}>✉</a>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 text-sm">
                {selected.email && <span className="text-gray-600">{selected.email}</span>}
                {selected.telephone && <span className="text-gray-600">· {selected.telephone}</span>}
                {typeof selected.experience_years === 'number' && (
                  <span className="text-gray-600">· {t('cvt.years', { n: selected.experience_years })}</span>
                )}
              </div>

              {selected.competences?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('cvt.skills')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.competences.slice(0, 20).map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {selected.langues?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('cvt.languages')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.langues.map((l, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Aperçu du CV */}
              <div className="mt-5 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <p className="text-sm font-semibold text-gray-700">
                    {t('cvt.preview')} {cvUrl && <span className="text-gray-400 font-normal tabular-nums">· {zoom}%</span>}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {cvUrl && !cvHidden && (
                      <>
                        <button onClick={() => setZoom((z) => Math.max(50, z - 25))} className="px-2 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50" aria-label={t('cvt.zoomOut')}>−</button>
                        <button onClick={() => setZoom(100)} className="px-2 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50" aria-label={t('cvt.zoomReset')}>↺</button>
                        <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="px-2 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-50" aria-label={t('cvt.zoomIn')}>+</button>
                      </>
                    )}
                    {cvUrl && (
                      <button onClick={() => setCvHidden((h) => !h)} className="px-3 py-1 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                        {cvHidden ? t('cvt.show') : t('cvt.hide')}
                      </button>
                    )}
                    {cvUrl && (
                      <a href={cvUrl} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                        {t('cvt.download')}
                      </a>
                    )}
                  </div>
                </div>

                {!selected.file_path ? (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-6 text-center">{t('cvt.noFile')}</p>
                ) : cvLoading ? (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-6 text-center">{t('cvt.loading')}</p>
                ) : !cvUrl ? (
                  <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-6 text-center">{t('cvt.previewError')}</p>
                ) : cvHidden ? null : (
                  <div className="border border-gray-200 rounded-xl overflow-auto bg-gray-50" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
                    <div style={{ width: `${zoom}%`, minWidth: zoom > 100 ? `${zoom}%` : undefined }}>
                      {isImage(selected) ? (
                        <img src={cvUrl} alt={selected.file_name || 'CV'} className="w-full" />
                      ) : isPdf(selected) ? (
                        <iframe src={cvUrl} title={selected.file_name || 'CV'} className="w-full block" style={{ height: 'calc(100vh - 17rem)', minHeight: 560, border: 0 }} />
                      ) : (
                        <p className="text-sm text-gray-500 p-6 text-center">{t('cvt.previewUnsupported')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {canManage && (
                <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
                  <button onClick={() => onEdit?.(selected)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                    {t('cvt.edit')}
                  </button>
                  <button onClick={() => onDelete?.(selected)}
                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                    {t('cvt.delete')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CvthequeExplorer;
