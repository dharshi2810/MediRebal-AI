import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    return aiClient;
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

// Memory cache to avoid repeated Gemini calls
const explanationCache = new Map<string, { text: string; expires: number }>();

function getCached(key: string): string | null {
  const item = explanationCache.get(key);
  if (item && item.expires > Date.now()) {
    return item.text;
  }
  return null;
}

function setCache(key: string, text: string, ttlMs: number = 5 * 60 * 1000) {
  explanationCache.set(key, { text, expires: Date.now() + ttlMs });
}

export async function generateGeminiTransferJustification(params: {
  fromName: string;
  toName: string;
  resource: string;
  quantity: number;
  recipientTimeToCritical: number;
  donorSurplusHours: number;
}): Promise<string> {
  const cacheKey = `transfer_${params.fromName}_${params.toName}_${params.quantity}_${Math.round(params.recipientTimeToCritical / 15)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const fallback = `Move ${params.quantity} ${params.resource} from ${params.fromName} to ${params.toName} — recipient reaches critical stock in ~${params.recipientTimeToCritical} mins while donor maintains ~${params.donorSurplusHours}h operational surplus.`;

  const ai = getAiClient();
  if (!ai) return fallback;

  try {
    const prompt = `You are a clinical logistics advisor for MediRebal AI, an Indian hospital resource coordination platform.
Write a concise, professional 1-line justification (maximum 28 words) for a cross-hospital resource transfer between Chennai hospitals based ONLY on these exact metrics:
- Donor: ${params.fromName} (has ~${params.donorSurplusHours} hours of surplus stock)
- Recipient: ${params.toName} (projected to reach critical stock in ${params.recipientTimeToCritical} minutes)
- Transfer item & quantity: ${params.quantity} units of ${params.resource}
Do NOT give medical diagnoses or medication advice. Keep it strictly focused on logistical urgency and surplus balancing. Return plain text only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const output = response.text ? response.text.trim().replace(/^["']|["']$/g, '') : fallback;
    setCache(cacheKey, output);
    return output;
  } catch (err) {
    console.warn('Gemini transfer justification error, using fallback:', err);
    return fallback;
  }
}

export async function generateGeminiPredictionExplanation(params: {
  hospitalName: string;
  currentStock: number;
  criticalThreshold: number;
  depletionRate: number;
  timeToCriticalMinutes: number;
  riskLevel: string;
}): Promise<string> {
  const cacheKey = `pred_${params.hospitalName}_${params.riskLevel}_${Math.round(params.timeToCriticalMinutes / 20)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const fallback = `Oxygen stock at ${params.hospitalName} stands at ${params.currentStock} cylinders (${params.depletionRate} units/hr). At current trend, buffer reaches critical threshold in ${params.timeToCriticalMinutes} minutes (Risk: ${params.riskLevel}).`;

  const ai = getAiClient();
  if (!ai) return fallback;

  try {
    const prompt = `You are MediRebal AI's healthcare resource prediction analyzer.
Provide a 2-sentence clinical logistics summary (max 45 words) explaining this oxygen consumption trend for ${params.hospitalName}:
- Current stock: ${params.currentStock} units
- Critical threshold: ${params.criticalThreshold} units
- Rate: ${params.depletionRate} units/hour
- Time-to-critical: ${params.timeToCriticalMinutes} minutes
- Risk Level: ${params.riskLevel}
Do not prescribe medical treatments. Focus on supply chain readiness. Return plain text only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const output = response.text ? response.text.trim() : fallback;
    setCache(cacheKey, output);
    return output;
  } catch (err) {
    console.warn('Gemini prediction explanation error, using fallback:', err);
    return fallback;
  }
}

export async function generateGeminiEmergencyGuidance(params: {
  requestType: string;
  area: string;
}): Promise<string> {
  const fallback = `For urgent ${params.requestType} in ${params.area}, multiple nearby Chennai hubs have been notified. Stay calm, keep phone lines clear, and dial 108 immediately if patient is in critical distress.`;

  const ai = getAiClient();
  if (!ai) return fallback;

  try {
    const prompt = `Generate a calm, 20-word emergency coordination notice for a patient requesting ${params.requestType} in ${params.area}, Chennai. Include 108 emergency ambulance reminder. DO NOT give medical diagnosis.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    return response.text ? response.text.trim() : fallback;
  } catch (err) {
    return fallback;
  }
}
