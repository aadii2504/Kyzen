const { GoogleGenAI } = require('@google/genai');

let ai = null;

const getGemini = () => {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not set — Journey Mode AI will be unavailable');
      return null;
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
};

module.exports = { getGemini };
