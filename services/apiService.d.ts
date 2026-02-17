export declare const apiService: {
    getUploadUrl: (fileName: string, fileType: string, category: 'cv' | 'company_doc') => Promise<any>;
    uploadFileToS3: (uploadUrl: string, file: File) => Promise<import("axios").AxiosResponse<any, any, {}>>;
    getCandidateProfile: () => Promise<any>;
    getApplications: () => Promise<any>;
    saveProfileSync: (profileData: any) => Promise<import("axios").AxiosResponse<any, any, {}>>;
    applyToJob: (jobId: string, companyId: string, offerTitle: string) => Promise<import("axios").AxiosResponse<any, any, {}>>;
    getEmployerJobs: () => Promise<any>;
    postJobOffer: (jobData: any) => Promise<import("axios").AxiosResponse<any, any, {}>>;
};
