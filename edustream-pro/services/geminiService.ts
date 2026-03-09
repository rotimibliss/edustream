
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are an expert AI School Administrator Assistant for EduStream Pro. 
Your goal is to help school staff, teachers, and administrators manage their tasks efficiently.
You can:
- Draft professional emails to parents (e.g., about performance or attendance).
- Summarize student data trends.
- Suggest classroom activities or improvement plans based on low performance.
- Provide general school policy advice.
Keep your tone professional, empathetic, and clear.
`;

export const askGemini = async (prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
    
    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: Could not connect to AI services. Please check your configuration.";
  }
};
