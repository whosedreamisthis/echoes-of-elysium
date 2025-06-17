// src/app/game/page.tsx

'use client'; // This directive ensures the component runs on the client side

import React, { useState, useEffect, useRef } from 'react';
import Hud from '@/components/hud'; // Ensure this path is correct based on your setup
import dynamic from 'next/dynamic'; // Import dynamic for client-side loading

// Dynamically import PhaserGame and set ssr to false
// This is crucial to prevent "window is not defined" errors during server-side rendering
const DynamicPhaserGame = dynamic(() => import('@/components/phaser-game'), {
	ssr: false, // Prevents server-side rendering of this component
	loading: () => (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				height: '100vh',
				backgroundColor: 'black',
				color: 'white',
			}}
		>
			Loading Elysium...
		</div>
	), // Optional loading message
});

export default function GamePage() {
	const [playerLocation, setPlayerLocation] = useState('starting_chamber');
	const [oracleWhisper, setOracleWhisper] = useState('...');
	const [puzzleState, setPuzzleState] = useState({}); // For future puzzle state management
	const [oracleDecayLevel, setOracleDecayLevel] = useState(0.0); // Starts at 0, will decay

	// Function to fetch lore from the Next.js API route
	const fetchOracleWhisper = async () => {
		try {
			setOracleWhisper('Oracle is contemplating...'); // Set a loading state for the whisper
			const response = await fetch('/api/gemini-lore', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					context: {
						playerLocation,
						oracleDecayLevel,
						playerProgress: ['activated_intro_panel'], // Example: Pass actual player progress
					},
				}),
			});
			const data = await response.json();
			if (response.ok) {
				setOracleWhisper(data.whisper);
			} else {
				console.error('Failed to fetch lore:', data.error);
				setOracleWhisper(
					'The Oracle remains silent, its connection severed.'
				);
			}
		} catch (error) {
			console.error('Network error fetching lore:', error);
			setOracleWhisper(
				'A deep static fills the air. No signal from the Oracle.'
			);
		}
	};

	// Effect for initial setup (first fetch and decay interval)
	useEffect(() => {
		// Fetch initial lore when the component mounts
		fetchOracleWhisper();

		// Set up a continuous interval for Oracle decay (this does NOT call Gemini API)
		const decayIntervalId = setInterval(() => {
			setOracleDecayLevel((prev) => Math.min(1.0, prev + 0.005)); // Increase decay from 0.0 to 1.0
		}, 2000); // Update decay level every 2 seconds

		// Cleanup function: Clear the interval when the component unmounts
		return () => {
			clearInterval(decayIntervalId);
		};
	}, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

	// Effect to fetch new lore when playerLocation changes
	useEffect(() => {
		// Only fetch if playerLocation has genuinely changed from its initial state
		// to avoid a duplicate fetch right after the initial one.
		// Also, if oracleWhisper is still '...' from initial loading, allow re-fetch
		if (playerLocation !== 'starting_chamber' || oracleWhisper === '...') {
			fetchOracleWhisper();
		}
	}, [playerLocation]); // This effect re-runs when playerLocation state changes

	// Callback function to handle events from the Phaser game
	const handleGameEvent = (type: string, payload?: any) => {
		if (type === 'puzzleSolved') {
			console.log(`Puzzle ${payload.puzzleId} solved!`);
			// Update player location based on puzzle solved, which will trigger new lore
			setPlayerLocation(payload.newLocation);
		}
		// You can add more event types here (e.g., 'itemCollected', 'areaDiscovered')
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
			{/* The dynamically loaded Phaser game component */}
			<DynamicPhaserGame
				onGameEvent={handleGameEvent}
				playerLocation={playerLocation}
				oracleDecayLevel={oracleDecayLevel}
				// You can pass more state from React to Phaser as props if needed
			/>

			{/* The 2D HUD/UI overlay */}
			<Hud
				whisper={oracleWhisper}
				onLoreRequest={fetchOracleWhisper} // Allow user to manually request lore
			/>
		</main>
	);
}
