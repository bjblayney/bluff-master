import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ObscureWord {
  word: string;
  definition: string;
}

export async function generateObscureWord(): Promise<ObscureWord> {
  const prompt = "Generate a single extremely obscure, rarely used English word and its real dictionary definition. The word should be something most native English speakers wouldn't know. Avoid common ones like 'pulchritudinous' or 'defenestration'.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            definition: { type: Type.STRING }
          },
          required: ["word", "definition"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      word: data.word || "Floccinaucinihilipilification",
      definition: data.definition || "The action or habit of estimating something as worthless."
    };
  } catch (error) {
    console.error("Error generating word:", error);
    return {
      word: "Bumbril",
      definition: "An old dialect word for a person who is clumsy or awkward."
    };
  }
}
