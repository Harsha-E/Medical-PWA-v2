/**
 * MedCare | Environment Config
 * Do NOT commit this file to public repositories.
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

function resolveApiBaseUrl() {
  try {
    if (typeof localStorage !== 'undefined') {
      const customUrl = localStorage.getItem('API_BASE_URL');
      if (customUrl && customUrl.trim()) return customUrl.trim();
    }
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'https://medcare-groq-proxy.harshaedupuganti70.workers.dev';
    }
    return 'http://localhost:8000';
  } catch (e) {
    return 'http://localhost:8000';
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
  API_BASE_URL: resolveApiBaseUrl(),
  getApiBaseUrl: resolveApiBaseUrl,
  GROQ_API_KEY: resolveGroqKey(),
  getGroqKey: resolveGroqKey,
  GEMINI_API_KEY: ""
};
