// config.example.js
// Rename to config.js and place in the root of the MedCheck frontend.
// Configures explicit dual backend URLs for MedCheck AI Proxy and Drug Intelligence Console.

window.ENV = {
  // AI Base URL for MedCheck Groq Proxy (Cloudflare Worker)
  AI_BASE_URL: "https://medcare-groq-proxy.harshaedupuganti70.workers.dev",
  
  // DIC Base URL for Drug Intelligence Console (Render backend)
  DIC_BASE_URL: "https://drug-intelligence-console.onrender.com",
  
  // Legacy alias mapping to DIC Base URL
  API_BASE_URL: "https://drug-intelligence-console.onrender.com"
};
