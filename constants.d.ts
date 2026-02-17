import { JobOffer, Company, Article } from './types';
export interface EnrichedJobOffer extends JobOffer {
    matchingScore: number;
}
export declare const MOCK_COMPANIES: Company[];
export declare const MOCK_OFFERS: EnrichedJobOffer[];
export declare const MOCK_APPLICATIONS: {
    id: string;
    offerTitle: string;
    companyName: string;
    date: string;
    status: string;
    statusKey: string;
    statusColor: string;
}[];
export declare const MOCK_ARTICLES: Article[];
export declare const CITIES: string[];
export declare const SECTORS: string[];
