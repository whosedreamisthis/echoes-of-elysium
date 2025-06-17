// src/app/api/gemini-lore/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
	throw new Error('GOOGLE_API_KEY is not set in .env.local');
}

const genAI = new GoogleGenerativeAI(API_KEY);
// Choose the Flash model
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(req: Request) {
	try {
		const { context } = await req.json();

		// Construct a highly specific prompt based on game context
		const prompt = `You are the fragmented consciousness of The Oracle, a decaying AI from a lost civilization called Elysium. The player is an archaeologist exploring your ruins.
Current location: ${context.playerLocation}.
Oracle's memory decay in this area: ${
			context.oracleDecayLevel * 100
		}% corrupted.
Player's recent progress: ${context.playerProgress.join(', ') || 'None'}.

Generate a very short, cryptic whisper (maximum 50 words, preferably less) from The Oracle. It should reflect its current state (fragmented, trying to recall, perhaps melancholic or slightly confused due to decay) and subtly hint at a forgotten purpose of this location or a past event related to Elysium's fall. Do not use conversational language or introduce yourself. Just the raw, fragmented thought.

Example whispers: "Circuits hum... echo of purpose... then silence.", "The great filtration... what was saved?", "Light seeks form... but chaos reigns."`;

		const result = await model.generateContent(prompt);
		const responseText = result.response.text();

		// Basic post-processing for free-tier: trim, remove leading/trailing conversational filler
		const cleanedText = responseText
			.replace(/^(The Oracle says:|Oracle:|Whisper:|Fragment:)\s*/i, '') // Remove common AI intros
			.trim()
			.split('\n')[0]; // Take only the first line if multiple are generated

		return NextResponse.json({ whisper: cleanedText });
	} catch (error) {
		console.error('Error calling Gemini API:', error);
		return NextResponse.json(
			{ error: 'Failed to generate lore. Oracle is silent.' },
			{ status: 500 }
		);
	}
}
