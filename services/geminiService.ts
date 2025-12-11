import { GoogleGenAI, Type } from "@google/genai";
import { DomainMetadata } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchDomainMetadata = async (url: string): Promise<DomainMetadata> => {
  try {
    const prompt = `
      Analyze the domain or URL: "${url}".
      Provide the following details in JSON format:
      1. A clean, displayable "name" for the app/domain.
      2. A brief 1-sentence "description".
      3. The likely "owner" (organization or "Private").
      4. The "registrationDate" (Year or Date).
      5. The "registrar" (e.g., GoDaddy, Namecheap, AWS).
      6. The estimated "expiresAt" date in YYYY-MM-DD format. If unknown or privacy protected, make a best guess based on standard 1-year increments from registration or return "Unknown".
      
      Return valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            owner: { type: Type.STRING },
            registrationDate: { type: Type.STRING },
            registrar: { type: Type.STRING },
            expiresAt: { type: Type.STRING, description: "YYYY-MM-DD or 'Unknown'" },
          },
          required: ["name", "description", "owner", "registrationDate"],
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from Gemini");

    return JSON.parse(jsonText) as DomainMetadata;

  } catch (error) {
    console.error("Gemini metadata fetch failed:", error);
    // Fallback
    return {
      name: new URL(url).hostname,
      description: "No description available.",
      owner: "Unknown",
      registrationDate: "Unknown",
      registrar: "Unknown",
      expiresAt: "Unknown"
    };
  }
};