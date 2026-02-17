
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SECTORS, CITIES } from '../constants';
import { extractInfoFromCV, extractInfoFromCompanyDoc } from '../services/geminiService';
import { apiService } from '../services/apiService';

const Register: React.FC = () => {
  const [role, setRole] = useState<'student' | 'company'>('student');
  const [isParsing, setIsParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<string[]>([]);
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [formData, setFormData] = useState({ 
    firstName: '',
    lastName: '',
    email: '', 
    password: '',
    school: '',
    city: '',
    phone: '',
    companySector: '',
    description: '',
    skills: '',
    experienceYears: 0,
    educationLevel: 'Bac+5 (Master/Ingénieur)',
    cvUrl: '',
    logoUrl: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setFormData({
      firstName: '', lastName: '', email: '', password: '', school: '', city: '',
      phone: '', companySector: '', description: '', skills: '',
      experienceYears: 0, educationLevel: 'Bac+5 (Master/Ingénieur)', cvUrl: '', logoUrl: ''
    });
    setConfirmPassword('');
    setAutoFilledFields([]);
    setUploadedFile(null);
    setUploadProgress(0);
  }, [role]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setIsParsing(true);
      setUploadProgress(20); // Simulation de début de lecture
      
      try {
        const base64Data = await fileToBase64(file);
        setUploadProgress(50); // Lecture terminée, envoi à l'IA

        let aiData;
        if (role === 'student') {
          aiData = await extractInfoFromCV(base64Data, file.type);
        } else {
          aiData = await extractInfoFromCompanyDoc(base64Data, file.type);
        }
        
        setUploadProgress(100);

        if (aiData) {
          const filled: string[] = [];
          const updatedData = { ...formData };

          const fieldMap: any = role === 'student' ? {
            firstName: aiData.firstName, lastName: aiData.lastName, email: aiData.email,
            city: aiData.city, phone: aiData.phone, school: aiData.school,
            description: aiData.description, skills: aiData.skills,
            educationLevel: aiData.educationLevel, experienceYears: aiData.experienceYears
          } : {
            firstName: aiData.firstName, companySector: aiData.companySector,
            email: aiData.email, city: aiData.city, phone: aiData.phone, description: aiData.description
          };

          Object.keys(fieldMap).forEach(key => {
            if (fieldMap[key]) {
              (updatedData as any)[key] = fieldMap[key];
              filled.push(key);
            }
          });

          setFormData(updatedData);
          setAutoFilledFields(filled);
        }
      } catch (error) {
        console.error("AI Analysis failed", error);
      } finally {
        setTimeout(() => {
          setIsParsing(false);
          setUploadProgress(0);
        }, 500);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== confirmPassword) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    try {
      let finalFileUrl = '';
      
      // Upload REEL vers S3 (Pipeline direct ultra-rapide)
      if (uploadedFile) {
        const category = role === 'student' ? 'cv' : 'company_doc';
        const { uploadUrl, publicUrl } = await apiService.getUploadUrl(uploadedFile.name, uploadedFile.type, category as any);
        await apiService.uploadFileToS3(uploadUrl, uploadedFile);
        finalFileUrl = publicUrl;
      }

      // Login + Sauvegarde DB immédiate
      await login(formData.email, role, {
        ...formData,
        [role === 'student' ? 'cvUrl' : 'companyDocUrl']: finalFileUrl,
        password: undefined 
      });

      // Redirection SANS latence
      navigate('/dashboard');
    } catch (error) {
      console.error("Registration failed", error);
      alert("Erreur lors de l'enregistrement. Vérifiez votre connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-3xl w-full bg-white rounded-[3rem] shadow-2xl p-8 md:p-14 border border-gray-100 relative">
        {/* Loader Overlay pour la synchronisation finale */}
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-[3rem] flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="font-black text-blue-900 animate-pulse">Synchronisation avec SoussMassa-RH...</p>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-2">Inscription</h1>
          <p className="text-gray-500 font-medium">Rejoignez l'écosystème RH du Souss-Massa.</p>
        </div>

        <div className="flex p-2 bg-gray-100 rounded-2xl mb-10">
          <button onClick={() => setRole('student')} className={`flex-1 py-4 text-sm font-black rounded-xl transition-all ${role === 'student' ? 'bg-white text-blue-700 shadow-md' : 'text-gray-500'}`}>Talent</button>
          <button onClick={() => setRole('company')} className={`flex-1 py-4 text-sm font-black rounded-xl transition-all ${role === 'company' ? 'bg-white text-blue-700 shadow-md' : 'text-gray-500'}`}>Entreprise</button>
        </div>

        <div className="mb-10">
          <div className={`relative border-4 border-dashed rounded-3xl p-8 text-center transition-all ${isParsing ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-200'}`}>
            <input type="file" id="ai-upload" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
            <label htmlFor="ai-upload" className="cursor-pointer block">
              {isParsing ? (
                <div className="space-y-4">
                  <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="text-blue-700 font-bold animate-pulse">Analyse intelligente en cours...</p>
                </div>
              ) : (
                <>
                  <div className={`w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center ${uploadedFile ? 'bg-green-500' : 'bg-blue-600'} text-white`}>
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <h3 className="font-black text-gray-900">{uploadedFile ? 'Document analysé !' : role === 'student' ? 'Glissez votre CV' : 'Glissez votre Plaquette'}</h3>
                  <p className="text-xs text-gray-400 mt-1">L'IA remplira le formulaire pour vous.</p>
                </>
              )}
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <input type="text" required placeholder={role === 'student' ? "Prénom" : "Nom de l'entreprise"} className={`w-full px-5 py-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white outline-none font-bold transition-all ${autoFilledFields.includes('firstName') ? 'ring-2 ring-green-400' : ''}`} value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
              {autoFilledFields.includes('firstName') && <span className="absolute right-4 top-4 text-green-500 text-[10px] font-black">AI ✓</span>}
            </div>
            {role === 'company' && (
              <select required className="w-full px-5 py-4 rounded-xl border border-gray-100 bg-gray-50 outline-none font-bold" value={formData.companySector} onChange={(e) => setFormData({...formData, companySector: e.target.value})}>
                <option value="">Secteur</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <input type="email" required placeholder="Email professionnel" className="w-full px-5 py-4 rounded-xl border border-gray-100 bg-gray-50 outline-none font-bold" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <select required className="w-full px-5 py-4 rounded-xl border border-gray-100 bg-gray-50 outline-none font-bold" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}>
              <option value="">Ville</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="password" required placeholder="Mot de passe" className="w-full px-5 py-4 rounded-xl border border-gray-100 bg-gray-50 outline-none font-bold" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            <input type="password" required placeholder="Confirmer" className={`w-full px-5 py-4 rounded-xl border border-gray-100 bg-gray-50 outline-none font-bold ${formData.password && confirmPassword && formData.password !== confirmPassword ? 'border-red-500' : ''}`} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <textarea placeholder="Description / Mission" rows={3} className="w-full px-5 py-4 rounded-xl border border-gray-100 bg-gray-50 outline-none font-bold" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          <button type="submit" disabled={isLoading || isParsing} className="w-full py-5 bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-800 transition-all transform active:scale-[0.98]">C'est parti !</button>
        </form>
      </div>
    </div>
  );
};

export default Register;
