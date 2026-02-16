
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Google GenAI SDK using the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  // Analyze a resume using Gemini model and return a JSON evaluation.
  analyzeResume: async (item: any) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Проанализируй резюме и дай оценку по 100-балльной шкале. 
      Резюме: ${JSON.stringify(item)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["score", "summary"],
          propertyOrdering: ["score", "summary", "strengths"]
        }
      }
    });
    // Use the .text property directly as per the latest SDK guidelines.
    return JSON.parse(response.text || '{}');
  },

  // Predict market salary based on position details.
  predictSalary: async (item: any) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Предскажи рыночную зарплату в Кыргызстане (в сомах) для данной позиции: ${JSON.stringify(item)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            averageSalary: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
          },
          required: ["averageSalary", "explanation"],
          propertyOrdering: ["averageSalary", "explanation"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  // Generate a professional cover letter for a job vacancy.
  generateCoverLetter: async (user: any, item: any) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Напиши профессиональное сопроводительное письмо на русском языке для вакансии: ${item.title}. Учитывай описание: ${item.description}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            letter: { type: Type.STRING }
          },
          required: ["letter"],
          propertyOrdering: ["letter"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }
};
