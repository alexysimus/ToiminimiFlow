import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseCategory } from "../types";

/**
 * ============================================================================
 * Gemini Receipt AI Service (Designated for Tier 2: Registered Users)
 * ============================================================================
 * 
 * In the planned two-tier privacy architecture:
 * - Tier 1 (Guest Mode): Zero-signup, on-device local storage. Receipts are linked
 *   via path/cloud URL. AI OCR is disabled.
 * - Tier 2 (Registered Users): Firebase Auth (Google & Apple Sign-In only) with cloud
 *   receipt archival (Google Drive / iCloud / Firebase Storage) and automated
 *   receipt scanning via Google Gemini multimodal API.
 */

const getApiKey = (): string | undefined => {
  // Safe environment accessor that works across Vite client and Node.js environments
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv?.VITE_GEMINI_API_KEY) {
      return metaEnv.VITE_GEMINI_API_KEY;
    }
  } catch (e) {
    // Ignore meta resolution error
  }

  try {
    if (typeof process !== 'undefined' && process.env && (process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY)) {
      return process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
    }
  } catch (e) {
    // Ignore process resolution error
  }

  return undefined;
};

const parseGeminiResponse = (text: string) => {
  try {
    // Clean potential markdown formatting if model ignores responseMimeType instruction
    const cleanText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse Gemini JSON response", e);
    return null;
  }
};

export const analyzeReceipt = async (base64Image: string, mimeType: string) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.info("Gemini OCR is inactive (Tier 1 guest mode or no API key set). Manual entry available.");
    return null;
  }

  try {
    // Initialize client with named parameter
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Analyze this receipt image. Extract the following information and return it in JSON format:
      1. "date": The payment date (YYYY-MM-DD format).
      2. "items": An array of objects, where each object has:
         - "description": Short description of the item.
         - "amount": The total price including VAT (number).
         - "category": Choose the best fit from [${Object.values(ExpenseCategory).join(', ')}].
      
      If you cannot clearly identify specific items, group them into a single item with the total amount.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  category: { type: Type.STRING }
                },
                required: ['description', 'amount', 'category']
              }
            }
          },
          required: ['date', 'items']
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return parseGeminiResponse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};