const { GoogleGenerativeAI } = require('@google/generative-ai');

let ai = null;

/**
 * @module geminiConfig
 * @description Standardized Google AI Studio (Gemini) configuration.
 * Uses the stable @google/generative-ai SDK.
 */
const getGemini = () => {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not set — Gemini features will be unavailable');
      return null;
    }
    // Initialize with the official stable SDK
    ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return ai;
};

module.exports = { getGemini };
