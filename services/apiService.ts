
import axios from 'axios';

// Utilisation de import.meta.env pour la compatibilité Vite
const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'https://soussmassa-rh.api.example.com/prod';

// Instance Axios configurée pour la rapidité et la fiabilité
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Timeout strict pour éviter les attentes infinies
});

// Intercepteur pour injecter les headers de manière dynamique et sans erreur
apiClient.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('stagiaires_user');
  const user = userStr ? JSON.parse(userStr) : {};
  
  config.headers['Content-Type'] = 'application/json';
  if (user.email) config.headers['X-User-Email'] = user.email;
  if (user.token) config.headers['Authorization'] = `Bearer ${user.token}`;
  
  return config;
});

export const apiService = {
  // --- CANDIDATE / RECRUITER PROFILE ---
  getCandidateProfile: async () => {
    const response = await apiClient.get('/candidates/profile');
    return response.data;
  },

  getApplications: async () => {
    const response = await apiClient.get('/candidates/applications');
    return response.data;
  },

  // Cette méthode assure la persistance immédiate en DB
  saveProfileSync: async (profileData: any) => {
    return apiClient.post('/candidates/profile', profileData);
  },

  applyToJob: async (jobId: string, companyId: string, offerTitle: string) => {
    return apiClient.post('/candidates/applications', { jobId, companyId, offerTitle });
  },

  // --- EMPLOYER ---
  getEmployerJobs: async () => {
    const response = await apiClient.get('/employer/jobs');
    return response.data;
  },

  postJobOffer: async (jobData: any) => {
    return apiClient.post('/employer/jobs', jobData);
  },

  // --- S3 UPLOAD ---
  getUploadUrl: async (fileName: string, fileType: string, category: 'cv' | 'company_doc') => {
    const response = await apiClient.post('/s3/upload-url', { fileName, fileType, category });
    return response.data;
  },

  uploadFileToS3: async (uploadUrl: string, file: File) => {
    const response = await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type }
    });
    return response;
  }
};
