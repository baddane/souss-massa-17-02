
import { GoogleGenAI, Type } from "@google/genai";

// Use process.env.API_KEY directly during initialization within functions to follow strict guidelines

export const getCareerAdvice = async (query: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tu es un expert en recrutement pour la région Souss-Massa au Maroc pour le site SoussMassa-RH (soussmassa-rh.com). 
      Réponds à la question suivante d'un étudiant ou d'un jeune diplômé en étant encourageant et pragmatique.
      Focalise tes conseils sur le dynamisme économique d'Agadir et de sa région quand c'est pertinent.
      Question: ${query}`,
      config: {
        temperature: 0.7,
        topP: 0.95,
      },
    });
    return response.text || "Désolé, je ne peux pas répondre pour le moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Une erreur est survenue lors de la génération des conseils.";
  }
};

export const extractInfoFromCV = async (base64Data: string, mimeType: string): Promise<any> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: "Analyse ce CV et extrais les informations suivantes sous forme d'objet JSON. Si une info est absente, mets une chaîne vide. Pour le niveau d'études, choisis parmi: 'Bac+2', 'Bac+3 (Licence)', 'Bac+5 (Master/Ingénieur)', 'Doctorat'. Pour la ville, essaie de trouver une ville marocaine. Pour les années d'expérience, extrais un nombre entier." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstName: { type: Type.STRING },
            lastName: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            city: { type: Type.STRING },
            educationLevel: { type: Type.STRING },
            experienceYears: { type: Type.NUMBER },
            skills: { type: Type.STRING },
            description: { type: Type.STRING },
            school: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error parsing CV:", error);
    return null;
  }
};

export const extractInfoFromCompanyDoc = async (base64Data: string, mimeType: string): Promise<any> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: "Analyse ce document d'entreprise (plaquette, registre, ou profil) et extrais les informations suivantes en JSON. Nom de l'entreprise (firstName), Secteur d'activité (companySector), Ville (city), Email de contact (email), Téléphone (phone), Description courte (description). Si absent, laisse vide." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstName: { type: Type.STRING }, // On utilise firstName pour stocker le nom de l'entreprise dans le formulaire existant
            companySector: { type: Type.STRING },
            city: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error parsing Company Doc:", error);
    return null;
  }
};

export const summarizeJobOffer = async (offerTitle: string, description: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Résume cette offre d'emploi publiée sur SoussMassa-RH en 3 points clés.
      Titre: ${offerTitle}
      Description: ${description}`,
      config: { temperature: 0.5 },
    });
    return response.text || description;
  } catch (error) {
    return description;
  }
};
