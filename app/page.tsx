// src/app/game/page.tsx (or src/app/page.tsx)

'use client'; // This ensures the component runs on the client side

import React, { useState, useEffect, useRef } from 'react';
import Hud from '@/components/hud'; // Your UI overlay
import PhaserGame from '@/components/phaser-game'; // The component that wraps Phaser

export default function GamePage() {
	const [playerLocation, setPlayerLocation] = useState('starting_chamber');
	const [oracleWhisper, setOracleWhisper] = useState('...');
	const [puzzleState, setPuzzleState] = useState({});
	const [oracleDecayLevel, setOracleDecayLevel] = useState(0.5); // Example decay

	// Ref to hold the Phaser game instance or communicate with it if needed
	const phaserGameRef = useRef<Phaser.Game | null>(null);

	// Function to request lore from API
	const fetchOracleWhisper = async () => {
		try {
			setOracleWhisper('Oracle is contemplating...'); // Loading state
			const response = await fetch('/api/gemini-lore', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					context: {
						playerLocation,
						oracleDecayLevel,
						playerProgress: ['activated_intro_panel'], // Example progress
					},
				}),
			});
			const data = await response.json();
			if (response.ok) {
				setOracleWhisper(data.whisper);
			} else {
				console.error('Failed to fetch lore:', data.error);
				setOracleWhisper(
					'A static message for when the Oracle is silent...'
				);
			}
		} catch (error) {
			console.error('Network error fetching lore:', error);
			setOracleWhisper('The connection to the Oracle flickers...');
		}
	};

	useEffect(() => {
		// Initial fetch or trigger based on game events
		fetchOracleWhisper();

		// Example: update decay level over time or based on game events
		const decayInterval = setInterval(() => {
			setOracleDecayLevel((prev) => Math.min(1, prev + 0.01)); // Example: decay increases
		}, 5000); // Every 5 seconds

		return () => clearInterval(decayInterval);
	}, []); // Run once on mount

	// This function would be passed down to the Phaser game component
	// to allow Phaser to notify React of game events.
	const handleGameEvent = (type: string, payload?: any) => {
		if (type === 'puzzleSolved') {
			console.log(`Puzzle ${payload.puzzleId} solved!`);
			setPlayerLocation(payload.newLocation); // Trigger React state update for new scene
			// Optionally fetch new lore after a puzzle is solved
			fetchOracleWhisper();
		}
		// Handle other events like 'playerMoved', 'itemCollected' etc.
	};

	return (
		<main
			style={{
				width: '100vw',
				height: '100vh',
				position: 'relative',
				overflow: 'hidden',
			}}
		>
			{/* Phaser Game Canvas */}
			<PhaserGame
				onGameEvent={handleGameEvent}
				playerLocation={playerLocation}
				oracleDecayLevel={oracleDecayLevel}
				// Pass other game state from React to Phaser as props if needed
			/>

			{/* 2D HUD/UI Overlay */}
			<Hud
				whisper={oracleWhisper}
				onLoreRequest={fetchOracleWhisper}
				// Pass any other state you want to display on the HUD
			/>
		</main>
	);
}
