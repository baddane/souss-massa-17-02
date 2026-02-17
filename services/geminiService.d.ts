export declare const getCareerAdvice: (query: string) => Promise<string>;
export declare const extractInfoFromCV: (base64Data: string, mimeType: string) => Promise<any>;
export declare const extractInfoFromCompanyDoc: (base64Data: string, mimeType: string) => Promise<any>;
export declare const summarizeJobOffer: (offerTitle: string, description: string) => Promise<string>;
