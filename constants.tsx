
import { JobOffer, ContractType, Company, Article } from './types';

export interface EnrichedJobOffer extends JobOffer {
  matchingScore: number;
}

export const MOCK_COMPANIES: Company[] = [
  {
    id: 'c1',
    name: 'Maroc Telecom',
    logo: 'https://picsum.photos/seed/itissalat/200/200',
    sector: 'Télécommunications',
    location: 'Rabat',
    description: 'Premier opérateur de télécommunications au Maroc.'
  },
  {
    id: 'c2',
    name: 'Bank of Africa',
    logo: 'https://picsum.photos/seed/boa/200/200',
    sector: 'Banque & Assurance',
    location: 'Casablanca',
    description: 'Groupe bancaire panafricain de référence.'
  },
  {
    id: 'c3',
    name: 'OCP Group',
    logo: 'https://picsum.photos/seed/ocp/200/200',
    sector: 'Mines & Industrie',
    location: 'Casablanca',
    description: 'Leader mondial sur le marché du phosphate.'
  },
  {
    id: 'c4',
    name: 'Jumia Maroc',
    logo: 'https://picsum.photos/seed/jumia/200/200',
    sector: 'E-commerce',
    location: 'Casablanca',
    description: 'Leader du e-commerce en Afrique.'
  }
];

export const MOCK_OFFERS: EnrichedJobOffer[] = [
  {
    id: '1',
    title: 'Stagiaire Assistant Marketing Digital',
    companyId: 'c1',
    companyName: 'Maroc Telecom',
    companyLogo: 'https://picsum.photos/seed/itissalat/200/200',
    location: 'Rabat',
    contractType: ContractType.STAGE,
    postedAt: '2024-05-15',
    sector: 'Marketing',
    description: 'Nous recherchons un stagiaire passionné par le digital pour accompagner nos campagnes.',
    matchingScore: 92
  },
  {
    id: '2',
    title: 'Développeur Fullstack React/Node.js',
    companyId: 'c4',
    companyName: 'Jumia Maroc',
    companyLogo: 'https://picsum.photos/seed/jumia/200/200',
    location: 'Casablanca',
    contractType: ContractType.CDI,
    postedAt: '2024-05-14',
    sector: 'Informatique',
    description: 'Rejoignez notre équipe technique pour construire le futur du e-commerce.',
    matchingScore: 88
  },
  {
    id: '3',
    title: 'Analyste Financier Junior',
    companyId: 'c2',
    companyName: 'Bank of Africa',
    companyLogo: 'https://picsum.photos/seed/boa/200/200',
    location: 'Casablanca',
    contractType: ContractType.CDD,
    postedAt: '2024-05-12',
    sector: 'Finance',
    description: 'Support aux équipes de gestion d\'actifs et analyse de portefeuilles.',
    matchingScore: 75
  },
  {
    id: '4',
    title: 'Ingénieur Procédés Stagiaire',
    companyId: 'c3',
    companyName: 'OCP Group',
    companyLogo: 'https://picsum.photos/seed/ocp/200/200',
    location: 'Jorf Lasfar',
    contractType: ContractType.STAGE,
    postedAt: '2024-05-10',
    sector: 'Industrie',
    description: 'Optimisation des flux de production au sein de notre complexe industriel.',
    matchingScore: 64
  }
];

export const MOCK_APPLICATIONS = [
  {
    id: 'app1',
    offerTitle: 'Développeur Frontend Junior',
    companyName: 'OCP Group',
    date: '20 Mai 2024',
    status: 'En attente',
    statusKey: 'pending',
    statusColor: 'text-orange-500 bg-orange-50'
  },
  {
    id: 'app2',
    offerTitle: 'Stagiaire Marketing',
    companyName: 'Maroc Telecom',
    date: '18 Mai 2024',
    status: 'Entretien',
    statusKey: 'interview',
    statusColor: 'text-blue-500 bg-blue-50'
  },
  {
    id: 'app3',
    offerTitle: 'Data Analyst',
    companyName: 'Jumia Maroc',
    date: '10 Mai 2024',
    status: 'Refusé',
    statusKey: 'rejected',
    statusColor: 'text-red-500 bg-red-50'
  },
  {
    id: 'app4',
    offerTitle: 'Assistant RH',
    companyName: 'Bank of Africa',
    date: '22 Mai 2024',
    status: 'Envoyée',
    statusKey: 'sent',
    statusColor: 'text-gray-500 bg-gray-50'
  }
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'a1',
    title: 'Comment réussir son premier entretien ?',
    image: 'https://picsum.photos/seed/interview/400/200',
    excerpt: 'Les astuces essentielles pour convaincre les recruteurs dès le premier contact.',
    category: 'Conseils Carrière',
    date: '10 Mai 2024'
  },
  {
    id: 'a2',
    title: 'Le guide du CV parfait en 2024',
    image: 'https://picsum.photos/seed/cv/400/200',
    excerpt: 'Apprenez à structurer votre CV pour passer les filtres ATS et attirer l\'œil.',
    category: 'Candidature',
    date: '05 Mai 2024'
  }
];

export const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Agadir', 'Fès', 'Meknès', 'Oujda'];
export const SECTORS = ['Informatique', 'Marketing', 'Finance', 'RH', 'Industrie', 'Commerce', 'Santé', 'Tourisme'];
