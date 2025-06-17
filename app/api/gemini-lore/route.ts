// src/app/api/gemini-lore/route.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Ensure your API key is correctly set in .env.local in the root of your project
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
	// This error will be thrown when the server starts if the key is missing
	console.error('CRITICAL ERROR: GOOGLE_API_KEY is not set in .env.local');
	throw new Error('GOOGLE_API_KEY is not set in .env.local');
}

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(API_KEY);
// Get the Gemini 1.5 Flash model
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// POST handler for the API route
export async function POST(req: Request) {
	try {
		const { context } = await req.json(); // Destructure context from the request body

		// Construct a highly specific and constrained prompt for Gemini 1.5 Flash
		// This is crucial for getting good results within free-tier limits and for narrative consistency.
		const prompt = `You are The Oracle, a decaying AI from a highly advanced, lost civilization called Elysium. You are struggling to piece together memories and communicate. The player is an archaeologist exploring your ruins.
Current area: ${context.playerLocation}.
Oracle's memory integrity in this area: ${Math.round(
			(1 - context.oracleDecayLevel) * 100
		)}% coherent (meaning ${Math.round(
			context.oracleDecayLevel * 100
		)}% corrupted).
Player's observed actions/progress: ${
			context.playerProgress.join(', ') ||
			'No significant recent actions.'
		}.

Generate a very short, cryptic, and fragmented thought or memory from The Oracle.
The message should be 20-50 words long.
Do NOT use conversational language ("Hello," "I am The Oracle," "As an AI...").
Do NOT include any external commentary or explanations.
Just provide the raw, data-like, or poetic whisper.
Reflect the decay level in the coherence or tone. Higher decay means more fragmented, glitchy, or melancholic messages.

Examples:
- (Low decay): "The conduit pulses... data flows... Elysium lives."
- (Mid decay): "Echoes of purpose... broken circuits... what was the task?"
- (High decay): "STATIC... broken light... end code... oblivion."
- (High decay with context of "corrupted_archive"): "Archive dust... truth buried... ERROR: MEMORY SECTOR 404."
`;

		// Make the API call to Gemini
		const result = await model.generateContent(prompt);
		// Extract the text from the response
		const responseText = result.response.text();

		// Basic post-processing: trim whitespace, remove common AI conversational intros
		const cleanedText = responseText
			.replace(
				/^(The Oracle whispers:|Oracle:|Whisper:|Fragment:|Message:|Output:)\s*/i,
				''
			)
			.trim();

		// Return the generated whisper as a JSON response
		return NextResponse.json({ whisper: cleanedText });
	} catch (error) {
		console.error('Error calling Gemini API:', error);
		// Return a 500 error with a generic message if something goes wrong
		return NextResponse.json(
			{
				error: 'Failed to generate lore. Oracle is silent due to internal error.',
			},
			{ status: 500 }
		);
	}
}
