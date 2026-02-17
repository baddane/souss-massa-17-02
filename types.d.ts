export declare enum ContractType {
    STAGE = "Stage",
    CDI = "CDI",
    CDD = "CDD",
    FREELANCE = "Freelance"
}
export interface Company {
    id: string;
    name: string;
    logo: string;
    sector: string;
    location: string;
    description: string;
}
export interface JobOffer {
    id: string;
    title: string;
    companyId: string;
    companyName: string;
    companyLogo: string;
    location: string;
    contractType: ContractType;
    postedAt: string;
    sector: string;
    description: string;
}
export interface Article {
    id: string;
    title: string;
    image: string;
    excerpt: string;
    category: string;
    date: string;
}
