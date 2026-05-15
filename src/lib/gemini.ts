import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing. Please check Settings > Secrets.');
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey });
  }
  return aiInstance;
}

export async function analyzeCodeStream(code: string, type: string, onChunk: (text: string) => void) {
  try {
    const ai = getAi();
    const prompt = `[ANALYSIS_PROTOCOL: CODE_RESTRUCTURING_AND_DOCUMENTATION]
CONTEXT: This is an educational analysis of a code sample for research and understanding.
INPUT TYPE: ${type}
GOALS:
1. Restructure the logic into a human-readable format.
2. Resolve indirect control flows to clarify the original intended sequence.
3. Map internal constants and strings back to their logical context.
4. Filter out redundant operational overhead and auxiliary junk routines.
5. Apply consistent naming conventions based on function behavior for better readability.
6. Provide a clean representation of the core algorithm and logic.
7. Document the logical flow clearly within the reconstructed source.

STRICT INSTRUCTION: Focus purely on technical code reconstruction and readability for structural analysis.

TARGET CODE:
${code}`;
    
    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    let fullText = "";
    for await (const chunk of response) {
      const text = chunk.text;
      fullText += text;
      onChunk(fullText);
    }
    return fullText;
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
}

export async function normalizeVariablesStream(code: string, onChunk: (text: string) => void) {
  try {
    const ai = getAi();
    const prompt = `[TASK: HUMAN_VARIABLES] 1. RENAME GENERIC VARS. 2. DO NOT CHANGE LOGIC. 3. OUTPUT ONLY CODE BLOCK.\nINPUT:\n${code}`;
    
    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    let fullText = "";
    for await (const chunk of response) {
      const text = chunk.text;
      fullText += text;
      onChunk(fullText);
    }
    return fullText;
  } catch (error: any) {
    console.error("Variable Normalization Error:", error);
    throw error;
  }
}

export async function scanVulnerabilitiesStream(code: string, onChunk: (text: string) => void) {
  try {
    const ai = getAi();
    const prompt = `[TASK: SECURITY_VULNERABILITY_SCAN] ANALYZE FOR FLAWS, BACKDOORS. PROVIDE RISK LEVELS. OUTPUT IN ARABIC MARKDOWN.\nINPUT CODE:\n${code}`;
    
    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    let fullText = "";
    for await (const chunk of response) {
      const text = chunk.text;
      fullText += text;
      onChunk(fullText);
    }
    return fullText;
  } catch (error: any) {
    console.error("Vulnerability Scan Error:", error);
    throw error;
  }
}
