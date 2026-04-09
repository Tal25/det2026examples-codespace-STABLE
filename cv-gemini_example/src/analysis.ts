import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface DetectedObject {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  label: string;
}

/**
 * Captures a frame from a video element and analyzes it using Gemini.
 * @param video The video element to capture from.
 * @returns A promise that resolves to an array of detected objects.
 */
export async function analyzeVideoFrame(video: HTMLVideoElement): Promise<DetectedObject[]> {
  // 1. Capture frame as base64
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(video, 0, 0);
  
  const base64Data = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];

  // 2. Call Gemini API
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Detect all prominent objects in this image. For each object, provide a bounding box as [ymin, xmin, ymax, xmax] (normalized 0-1000) and a short label." },
          { inlineData: { mimeType: "image/jpeg", data: base64Data } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            box_2d: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: "[ymin, xmin, ymax, xmax] coordinates"
            },
            label: { type: Type.STRING, description: "Name of the object" }
          },
          required: ["box_2d", "label"]
        }
      }
    }
  });

  // 3. Parse and return result
  return JSON.parse(response.text || "[]") as DetectedObject[];
}
