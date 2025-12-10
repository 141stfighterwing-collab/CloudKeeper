import { GoogleGenAI, Type } from "@google/genai";
import { DomainMetadata } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchDomainMetadata = async (url: string): Promise<DomainMetadata> => {
  try {
    const prompt = `
      Analyze the domain or URL: "${url}".
      Provide a likely name for this service/app, a brief 1-sentence description, 
      the likely owner (organization or "Private"), and an estimated or known registration date/year.
      If it is a localhost or private IP, just describe it as a local service.
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
            name: { type: Type.STRING, description: "A clean, displayable name for the app/domain" },
            description: { type: Type.STRING, description: "A short description of what the site does" },
            owner: { type: Type.STRING, description: "The likely owner or 'Unknown'" },
            registrationDate: { type: Type.STRING, description: "The registration year or date, or 'Unknown'" },
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
    // Fallback if Gemini fails or API key is missing
    return {
      name: new URL(url).hostname,
      description: "No description available.",
      owner: "Unknown",
      registrationDate: "Unknown"
    };
  }
};