
import { GoogleGenAI, Type } from "@google/genai";
import { CircuitData } from '../types';

// Initialize Gemini Client
// NOTE: In a real app, never expose API keys on the client side if possible. 
// We use process.env.API_KEY as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a circuit design JSON based on a user prompt using Gemini 2.5 Flash.
 */
export const generateCircuitDesign = async (prompt: string): Promise<CircuitData | null> => {
  try {
    const modelId = 'gemini-2.5-flash';
    
    const systemInstruction = `
      You are an expert electronics engineer and circuit designer. 
      Your task is to convert natural language descriptions of electronic circuits into a specific JSON structure.
      
      The JSON structure must be valid and adhere to this schema:
      {
        "nodes": [
          { "id": "string", "type": "source" | "resistor" | "capacitor" | "inductor" | "led" | "transistor" | "ic" | "ground" | "switch", "label": "string", "x": number, "y": number, "value": "string" (optional) }
        ],
        "connections": [
          { "id": "string", "sourceId": "string", "targetId": "string" }
        ]
      }

      Layout Rules:
      1. Arrange components logically. Inputs (Sources) generally on the left, Outputs (LEDs, Speakers) on the right.
      2. Use 'x' and 'y' coordinates to position them on a canvas roughly 800x600.
      3. Ensure connections make sense electrically.
      4. For switches, default value to "open" unless specified otherwise.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Design a circuit for: ${prompt}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['source', 'resistor', 'capacitor', 'inductor', 'led', 'transistor', 'ic', 'ground', 'switch'] },
                  label: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  value: { type: Type.STRING, nullable: true },
                },
                required: ['id', 'type', 'label', 'x', 'y'],
              },
            },
            connections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  sourceId: { type: Type.STRING },
                  targetId: { type: Type.STRING },
                },
                required: ['id', 'sourceId', 'targetId'],
              },
            },
          },
          required: ['nodes', 'connections'],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as CircuitData;
  } catch (error) {
    console.error("Gemini Circuit Generation Error:", error);
    return null;
  }
};

/**
 * Analyzes a circuit and provides a text explanation/feedback.
 */
export const analyzeCircuit = async (circuitData: CircuitData): Promise<string> => {
  try {
    const modelId = 'gemini-2.5-flash';
    const prompt = `Analyze this electronic circuit data and explain what it does, potential issues, and suggestions for improvement: ${JSON.stringify(circuitData)}`;
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    
    return response.text || "Could not analyze circuit.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Error analyzing circuit.";
  }
};
