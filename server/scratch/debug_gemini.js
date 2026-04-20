require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function list() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // There isn't a direct listModels in the standard JS SDK, 
    // but we can try a basic generation to check connectivity
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("SUCCESS:", await result.response.text());
  } catch (e) {
    console.error("FAILED:", e.message);
    if (e.response) {
      console.error("RESPONSE DATA:", await e.response.json());
    }
  }
}

list();
