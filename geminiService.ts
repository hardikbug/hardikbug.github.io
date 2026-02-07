
import { GoogleGenAI, Type, Modality } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Utility to extract cleaner error messages from Gemini API responses
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  
  const message = error?.message || '';
  const errorJson = typeof error === 'object' ? JSON.stringify(error) : '';
  
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || errorJson.includes('429')) {
    return 'The AI is currently busy. Please wait 10 seconds and try again.';
  }
  
  if (message.includes('500') || message.includes('Internal Server Error')) {
    return 'The AI server is experiencing a temporary hiccup. Please try again.';
  }

  if (message.includes('Requested entity was not found')) {
    return 'The configured project was not found. Please re-select your API key.';
  }

  return message || 'An unexpected error occurred.';
}

/**
 * Utility to call Gemini API with exponential backoff for rate limits (429)
 */
async function callWithRetry<T>(fn: () => Promise<T>, retries = 5, baseDelay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const message = error?.message || '';
    const errorJson = typeof error === 'object' ? JSON.stringify(error) : '';
    const isRateLimit = message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || errorJson.includes('429');
    
    // Check for "Requested entity was not found" to prompt re-selection
    if (message.includes('Requested entity was not found')) {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        // @ts-ignore
        window.aistudio.openSelectKey();
      }
      throw error;
    }

    if (isRateLimit && retries > 0) {
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      console.warn(`Rate limit reached. Retrying in ${Math.round(delay)}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

export const getSmartSaleAdvisory = async (crop: string, currentPrice: number, language: string = 'English') => {
  return callWithRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze current market trends for ${crop} (Current Price: ₹${currentPrice}). Provide a concise smart sale advice (max 40 words) in ${language}. Should the farmer hold or sell? Include a target price prediction.`,
    });
    return response.text;
  });
};

export const getWeatherData = async (location: string, language: string = 'English'): Promise<any> => {
  return callWithRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a realistic agricultural weather report for the location "${location}". 
      Provide: current temperature, condition (e.g., Sunny, Partly Cloudy), a Material Symbol icon name, humidity %, wind speed (km/h), UV index, rainfall chance %, and a concise agricultural advice (e.g., 'Good for fertilizer application' or 'Irrigate tonight'). 
      Also provide a 5-day forecast with day names, temperatures, and icon names. Localize to ${language}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            location: { type: Type.STRING },
            temp: { type: Type.NUMBER },
            condition: { type: Type.STRING },
            icon: { type: Type.STRING },
            humidity: { type: Type.NUMBER },
            windSpeed: { type: Type.NUMBER },
            uvIndex: { type: Type.NUMBER },
            rainfallChance: { type: Type.NUMBER },
            agriAdvice: { type: Type.STRING },
            forecast: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  temp: { type: Type.NUMBER },
                  icon: { type: Type.STRING }
                },
                required: ['day', 'temp', 'icon']
              }
            }
          },
          required: ['location', 'temp', 'condition', 'icon', 'humidity', 'windSpeed', 'uvIndex', 'rainfallChance', 'agriAdvice', 'forecast']
        }
      }
    });
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse weather data", e);
      return null;
    }
  });
};

export const getLocalMarketData = async (location: string, language: string = 'English'): Promise<any[]> => {
  return callWithRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search/Analyze real-time or recent agricultural trading data for the location: "${location}". Identify 5 most relevant crops for this specific region. For each, provide current market price (per Quintal in INR), price trend, price change, and a representative emoji. Response language: ${language}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              crop: { type: Type.STRING },
              price: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              trend: { type: Type.STRING, enum: ['up', 'down', 'stable'] },
              change: { type: Type.NUMBER },
              emoji: { type: Type.STRING },
              verified: { type: Type.BOOLEAN }
            },
            required: ['crop', 'price', 'unit', 'trend', 'change', 'emoji']
          }
        }
      }
    });
    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse market data", e);
      return [];
    }
  });
};

export const verifyProduct = async (imageBase64: string, language: string = 'English'): Promise<any> => {
  return callWithRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
          { text: `Act as a specialized agricultural forensic expert. Analyze this product image. Determine if it is likely ORIGINAL or FRAUD/FAKE. Return ONLY JSON with fields: status (success|failure), productName, brand, batchNumber, expiryDate, serial, reasoning, confidenceScore (0-100). Localize reasoning to ${language}.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['success', 'failure'] },
            productName: { type: Type.STRING },
            brand: { type: Type.STRING },
            batchNumber: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            serial: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER }
          },
          required: ['status', 'productName', 'brand', 'reasoning', 'confidenceScore']
        }
      }
    });
    
    try {
      return JSON.parse(response.text);
    } catch (e) {
      return { status: 'failure', productName: 'Unknown Product', brand: 'Unknown', reasoning: 'Could not parse verification results.', confidenceScore: 0 };
    }
  });
};

export const generateVoiceExplanation = async (text: string, language: string = 'English') => {
  // Truncate text to avoid model limits
  const safeText = text.substring(0, 1000);
  
  return callWithRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Please read this clearly in ${language}: ${safeText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      console.warn("TTS candidate has no parts", response);
      return undefined;
    }

    // Comprehensive search for audio data in parts
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
    }
    
    console.warn("No inline audio data found in TTS response parts");
    return undefined;
  }, 3, 2000);
};

export const getAdvisoryResponse = async (query: string, language: string = 'English') => {
  return callWithRetry(async () => {
    const ai = getAI();
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are KisanDost, a friendly and expert agricultural advisor. 
        Your goal is to provide deep, detailed, and actionable explanations for every question, especially crop-related ones (sowing, pests, fertilizers, harvest). 
        Always explain the "why" behind your advice. Use bullet points for clarity. 
        Respond exclusively in ${language}.`,
      },
    });
    const response = await chat.sendMessage({ message: query });
    return response.text;
  });
};

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playPCM = async (base64Audio: string) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const audioData = decodeBase64(base64Audio);
  const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
  return { source, audioContext, duration: audioBuffer.duration };
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
