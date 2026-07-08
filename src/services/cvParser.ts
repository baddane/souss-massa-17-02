// Parsing de CV 100% côté client, SANS LLM.
// - Extraction de texte : PDF (pdf.js) + Word .docx (mammoth) + .txt + images (OCR tesseract.js, FR).
// - Extraction de champs : regex + dictionnaires (email, téléphone, ville, diplôme, compétences, expérience…).
// Les libs sont chargées en import dynamique → chunks séparés (n'alourdit pas le bundle du site public).
// L'OCR télécharge un pack de langue FR au 1er usage et prend quelques secondes par image.

export interface ParsedCv {
  nom_complet: string;
  email: string;
  telephone: string;
  ville: string;
  quartier: string;
  poste: string;
  diplome: string;
  niveau_etudes: string;
  competences: string[];
  langues: string[];
  experience_years: number | null;
  experience_resume: string;
  keywords: string[];
  raw_text: string;
}

// ---------- Dictionnaires ----------
const MOROCCAN_CITIES = [
  'Agadir', 'Inezgane', 'Ait Melloul', 'Aït Melloul', 'Dcheira', 'Taroudant', 'Tiznit', 'Ouarzazate',
  'Chtouka', 'Ait Baha', 'Biougra', 'Tata', 'Sidi Ifni', 'Zagora', 'Tinghir', 'Guelmim', 'Oulad Teima',
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Fes', 'Tanger', 'Meknès', 'Meknes', 'Oujda', 'Kénitra', 'Kenitra',
  'Tétouan', 'Tetouan', 'Safi', 'Mohammedia', 'El Jadida', 'Béni Mellal', 'Beni Mellal', 'Nador', 'Settat',
  'Laayoune', 'Laâyoune', 'Essaouira', 'Khouribga', 'Berrechid', 'Témara', 'Temara', 'Salé', 'Sale',
];

const SKILLS = [
  // IT / bureautique
  'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node', 'PHP', 'Laravel', 'Symfony', 'Python',
  'Java', 'C++', 'C#', '.NET', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'HTML', 'CSS', 'WordPress',
  'Photoshop', 'Illustrator', 'InDesign', 'AutoCAD', 'SketchUp', 'Excel', 'Word', 'PowerPoint', 'Access',
  'SAP', 'Sage', 'Odoo', 'Power BI', 'Git', 'Linux', 'Windows Server', 'Réseaux', 'Cybersécurité',
  // gestion / admin / compta
  'Comptabilité', 'Gestion', 'Fiscalité', 'Paie', 'Audit', 'Contrôle de gestion', 'Facturation',
  'Ressources humaines', 'Recrutement', 'Secrétariat', 'Assistanat', 'Archivage',
  // commerce / marketing
  'Vente', 'Négociation', 'Prospection', 'Marketing', 'Marketing digital', 'SEO', 'Community management',
  'Relation client', 'Caisse', 'Merchandising', 'Télévente',
  // industrie / btp / technique
  'Maintenance', 'Électricité', 'Mécanique', 'Soudure', 'Plomberie', 'Menuiserie', 'Usinage', 'Production',
  'Qualité', 'HSE', 'Logistique', 'Magasinage', 'Conduite de ligne', 'Froid', 'Climatisation',
  // tourisme / restauration / santé
  'Cuisine', 'Pâtisserie', 'Service en salle', 'Réception', 'Réservation', 'Étage', 'Bar',
  'Soins infirmiers', 'Aide-soignant', 'Pharmacie', 'Esthétique',
];

const LANGUAGES = [
  { key: 'Arabe', rx: /\barabe?\b/i },
  { key: 'Français', rx: /\bfran[cç]ais\b/i },
  { key: 'Anglais', rx: /\banglais\b|\benglish\b/i },
  { key: 'Espagnol', rx: /\bespagnol\b|\bespañol\b/i },
  { key: 'Allemand', rx: /\ballemand\b|\bdeutsch\b/i },
  { key: 'Amazigh', rx: /\bamazighe?\b|\bberb[eè]re\b|\btamazight\b/i },
];

const JOB_TITLES = [
  'Développeur', 'Developpeur', 'Ingénieur', 'Technicien', 'Comptable', 'Aide-comptable', 'Assistant',
  'Assistante', 'Secrétaire', 'Commercial', 'Commerciale', 'Vendeur', 'Vendeuse', 'Caissier', 'Caissière',
  'Chef de projet', 'Chef de partie', 'Cuisinier', 'Serveur', 'Réceptionniste', 'Manager', 'Directeur',
  'Responsable', 'Magasinier', 'Chauffeur', 'Électricien', 'Mécanicien', 'Menuisier', 'Soudeur',
  'Infirmier', 'Infirmière', 'Aide-soignant', 'Pharmacien', 'Esthéticienne', 'Agent', 'Opérateur',
  'Téléconseiller', 'Téléopérateur', 'Formateur', 'Enseignant', 'Graphiste', 'Community manager',
];

// ---------- Extraction du texte ----------
export async function extractText(file: File): Promise<{ text: string; supported: boolean }> {
  const name = file.name.toLowerCase();
  const type = file.type;

  // .txt
  if (type === 'text/plain' || name.endsWith('.txt')) {
    return { text: await file.text(), supported: true };
  }

  // PDF
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    const pdfjs: any = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(' ') + '\n';
    }
    return { text, supported: true };
  }

  // Word .docx
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    const mod: any = await import('mammoth/mammoth.browser.js');
    const mammoth = mod.default || mod;
    const buf = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return { text: res.value || '', supported: true };
  }

  // Images : OCR via tesseract.js (moteur OCR, PAS un LLM). Charge un pack de langue FR
  // au 1er usage (téléchargé depuis le CDN tesseract). Lent (quelques s/image).
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(name)) {
    try {
      const mod: any = await import('tesseract.js');
      const recognize = mod.recognize || mod.default?.recognize;
      const { data } = await recognize(file, 'fra');
      const text = (data?.text || '').trim();
      return { text, supported: text.length > 0 };
    } catch {
      return { text: '', supported: false };
    }
  }

  // Ancien .doc et formats inconnus : pas d'extraction → saisie manuelle
  return { text: '', supported: false };
}

// ---------- Extraction des champs ----------
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function findEmail(t: string): string {
  const m = t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m ? m[0] : '';
}

function findPhone(t: string): string {
  // Formats marocains : +212..., 06.., 05.., 07.. (9 à 10 chiffres avec séparateurs)
  const m = t.match(/(?:\+212|00212|0)\s?[\d](?:[\s.\-]?\d){7,9}/);
  return m ? m[0].replace(/\s+/g, ' ').trim() : '';
}

function findCity(t: string): string {
  const nt = norm(t);
  for (const c of MOROCCAN_CITIES) {
    if (nt.includes(norm(c))) return c;
  }
  return '';
}

function findQuartier(t: string): string {
  const m = t.match(/\b(?:quartier|hay|cit[ée]|lot(?:issement)?|r[ée]sidence)\s+[A-Za-zÀ-ÿ][\w'’\- ]{2,30}/i);
  return m ? m[0].replace(/\s+/g, ' ').trim() : '';
}

function findNiveau(t: string): { niveau: string; diplome: string } {
  let niveau = '';
  if (/\b(doctorat|phd|these|thèse)\b/i.test(t)) niveau = 'Doctorat';
  else if (/master|ing[eé]nieur|bac\s*\+\s*5|bac\+5|dess|dea/i.test(t)) niveau = 'Bac+5 (Master/Ingénieur)';
  else if (/licence|bac\s*\+\s*3|bac\+3|bachelor/i.test(t)) niveau = 'Bac+3 (Licence)';
  else if (/\b(dut|bts|deug|deust|technicien sp[eé]cialis[eé])\b|bac\s*\+\s*2|bac\+2/i.test(t)) niveau = 'Bac+2';
  else if (/baccalaur[eé]at|\bbac\b/i.test(t)) niveau = 'Bac';
  // ligne de diplôme (première occurrence)
  let diplome = '';
  const dm = t.match(/((?:licence|master|dipl[oô]me|ing[eé]nieur|dut|bts|baccalaur[eé]at|doctorat)[^\n.;]{0,70})/i);
  if (dm) diplome = dm[1].replace(/\s+/g, ' ').trim();
  return { niveau, diplome };
}

function findSkills(t: string): string[] {
  const nt = norm(t);
  const found = SKILLS.filter(s => nt.includes(norm(s)));
  return Array.from(new Set(found));
}

function findLanguages(t: string): string[] {
  return LANGUAGES.filter(l => l.rx.test(t)).map(l => l.key);
}

function findExperience(t: string): number | null {
  let max: number | null = null;
  const rx = /(\d{1,2})\s*(?:\+)?\s*(?:ans?|ann[ée]es?)\s*(?:d['’ ]?\s*)?(?:exp[ée]rience|d['’]exp)/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(t))) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n) && (max === null || n > max)) max = n;
  }
  return max;
}

function findJobTitle(t: string): string {
  const nt = norm(t);
  for (const j of JOB_TITLES) {
    if (nt.includes(norm(j))) return j;
  }
  return '';
}

function findName(t: string): string {
  const lines = t.split(/\n+/).map(l => l.trim()).filter(Boolean).slice(0, 8);
  for (const line of lines) {
    if (/@|\d/.test(line)) continue;
    const words = line.split(/\s+/);
    const caps = words.filter(w => /^[A-ZÀ-Þ][a-zà-ÿ'’\-]+$|^[A-ZÀ-Þ'’\-]{2,}$/.test(w));
    if (caps.length >= 2 && words.length <= 5) return line.replace(/\s+/g, ' ').trim();
  }
  return '';
}

export function parseFields(rawText: string): ParsedCv {
  const t = rawText || '';
  const { niveau, diplome } = findNiveau(t);
  const competences = findSkills(t);
  const poste = findJobTitle(t);
  const ville = findCity(t);
  const keywords = Array.from(new Set([
    ...competences,
    ...(poste ? [poste] : []),
    ...(ville ? [ville] : []),
    ...(niveau ? [niveau] : []),
  ])).map(k => k.toLowerCase());

  return {
    nom_complet: findName(t),
    email: findEmail(t),
    telephone: findPhone(t),
    ville,
    quartier: findQuartier(t),
    poste,
    diplome,
    niveau_etudes: niveau,
    competences,
    langues: findLanguages(t),
    experience_years: findExperience(t),
    experience_resume: '',
    keywords,
    raw_text: t.slice(0, 20000),
  };
}

// Extraction complète (texte + champs) pour un fichier
export async function parseCvFile(file: File): Promise<{ parsed: ParsedCv; supported: boolean }> {
  const { text, supported } = await extractText(file);
  const parsed = parseFields(text);
  return { parsed, supported };
}
