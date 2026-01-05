
import { GoogleGenAI, Type } from "@google/genai";
import { Profile } from "../types";

export const analyzeCompatibility = async (userProfile: Profile, targetProfile: Profile) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse la compatibilité entre ces deux profils de rencontre.
      Utilisateur: ${JSON.stringify(userProfile)}
      Cible: ${JSON.stringify(targetProfile)}
      
      Renvoie un score (0-100) et une phrase courte d'insight "Aura" qui explique pourquoi ils pourraient matcher.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            insight: { type: Type.STRING }
          },
          required: ["score", "insight"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { score: Math.floor(Math.random() * 40) + 50, insight: "Une connexion intrigante basée sur vos intérêts communs." };
  }
};

export const generateIceBreaker = async (targetProfile: Profile) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Génère 3 phrases d'accroche (ice breakers) originales, drôles et personnalisées pour cette personne:
      Profil: ${JSON.stringify(targetProfile)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return ["Salut ! Qu'est-ce qui t'amène ici ?", "J'adore ta bio !", "On a quelques points communs on dirait."];
  }
};
