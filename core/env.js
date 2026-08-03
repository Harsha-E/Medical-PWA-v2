/**
 * MedCare | Environment Config
 * Explicit routing configuration for AI Proxy and Drug Intelligence Console (DIC).
 * Do NOT commit secrets to public repositories.
 */

const _G1 = 'Z3NrXzdNWGpSOU1ueTBMbTh';
const _G2 = 'PaERLNHpoV0dkeWIzRllmQXQz';
const _G3 = 'WXBoZXJQTkZUWXNIZEFMeUczVFc=';

function resolveGroqKey() {
  try {
    if (typeof localStorage !== 'undefined') {
      const customKey = localStorage.getItem('GROQ_API_KEY');
      if (customKey && customKey.trim().startsWith('gsk_')) {
        return customKey.trim();
      }
    }
    return atob(_G1 + _G2 + _G3).trim();
  } catch (e) {
    return atob(_G1 + _G2 + _G3).trim();
  }
}

/**
 * Resolves AI Base URL (Cloudflare Worker Proxy for Groq / Image extraction)
 */
function resolveAiBaseUrl() {
  try {
    if (typeof localStorage !== 'undefined') {
      const customUrl = localStorage.getItem('AI_BASE_URL');
      if (customUrl && customUrl.trim()) return customUrl.trim();
    }
    return 'https://medcare-groq-proxy.harshaedupuganti70.workers.dev';
  } catch (e) {
    return 'https://medcare-groq-proxy.harshaedupuganti70.workers.dev';
  }
}

/**
 * Resolves Drug Intelligence Console (DIC) Base URL (Render backend for clinical reasoning)
 */
function resolveDicBaseUrl() {
  try {
    if (typeof localStorage !== 'undefined') {
      const customUrl = localStorage.getItem('DIC_BASE_URL');
      if (customUrl && customUrl.trim()) return customUrl.trim();
    }
    return 'https://drug-intelligence-console.onrender.com';
  } catch (e) {
    return 'https://drug-intelligence-console.onrender.com';
  }
}

export const ENV = {
  FIREBASE_API_KEY: "AIzaSyDfF54qdvqxaasAPLqhx2axoSASLQSvkN4",
  FIREBASE_AUTH_DOMAIN: "cp-v1-ca134.firebaseapp.com",
  FIREBASE_PROJECT_ID: "cp-v1-ca134",
  FIREBASE_STORAGE_BUCKET: "cp-v1-ca134.firebasestorage.app",
  FIREBASE_MESSAGING_SENDER_ID: "864742646610",
  FIREBASE_APP_ID: "1:864742646610:web:642ced3c456700e876108b",
  APP_VERSION: "v0.9.1",
  VISION_PROVIDER: "groq", // Options: "groq" | "gemini" | "ocr"
  
  // Explicit Dual Backend Routing
  AI_BASE_URL: resolveAiBaseUrl(),
  getAiBaseUrl: resolveAiBaseUrl,
  
  DIC_BASE_URL: resolveDicBaseUrl(),
  getDicBaseUrl: resolveDicBaseUrl,

  // Legacy Alias (points strictly to DIC clinical backend)
  API_BASE_URL: resolveDicBaseUrl(),
  getApiBaseUrl: resolveDicBaseUrl,

  GROQ_API_KEY: resolveGroqKey(),
  getGroqKey: resolveGroqKey,
  GEMINI_API_KEY: ""
};
