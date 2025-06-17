// src/app/game/page.tsx

'use client'; // This directive is crucial for client-side components in Next.js App Router

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic'; // Used for dynamic import to prevent SSR issues with Phaser
import Whisper from '@/components/whisper'; // Your Whisper UI component
import { PhaserGameRef } from '@/game/phaser-game'; // Importing the type for the Phaser ref

// Dynamically import PhaserGame with SSR disabled
// This prevents Phaser from trying to run on the server where 'window' is not defined.
const PhaserGame = dynamic(
	() => import('@/game/phaser-game'), // This imports the default export from phaser-game.tsx
	{
		ssr: false, // Do NOT server-side render this component
		// Optional: Add a loading component to display while the game is being loaded
		// loading: () => <p style={{ color: 'white', textAlign: 'center', padding: '20px' }}>Loading game...</p>,
	}
);

// Define props structure to pass to the Phaser GameScene
interface GameSceneProps {
	playerLocation: string;
	oracleDecayLevel: number;
}

export default function GamePage() {
	// Initialize whispers with a starting message to ensure Whisper UI is visible
	const [whispers, setWhispers] = useState<string[]>([
		'Oracle: System initialized. Awaiting input.',
	]);
	const [playerLocation, setPlayerLocation] =
		useState<string>('starting_chamber');
	const [oracleDecayLevel, setOracleDecayLevel] = useState<number>(0);

	// Ref to interact with the Phaser game instance from React
	const phaserRef = useRef<PhaserGameRef | null>(null);

	// Ref to hold the current props for Phaser (synced with React state)
	const gameScenePropsRef = useRef<GameSceneProps>({
		playerLocation,
		oracleDecayLevel,
	});

	// Callback function to handle events emitted from the Phaser game
	const handleGameEvent = useCallback((type: string, payload?: any) => {
		if (type === 'puzzleSolved') {
			const { puzzleId, newLocation } = payload;
			console.log(
				`Puzzle Solved: ${puzzleId}. Moving to ${newLocation}.`
			);
			setWhispers((prev) => [
				...prev,
				`Oracle: The anomaly shifts. A new path reveals itself in the ${newLocation.replace(
					'_',
					' '
				)}.`,
			]);
			if (newLocation) {
				setPlayerLocation(newLocation);
			}
		} else if (type === 'roomChanged') {
			const { newLocation } = payload;
			console.log(`Player entered: ${newLocation}`);
			setPlayerLocation(newLocation); // Update React state to reflect new room
		}
		// Add other event types here as your game grows
	}, []); // Empty dependency array ensures this function is stable

	// Effect to update Phaser game scene's props when React state changes
	useEffect(() => {
		gameScenePropsRef.current = { playerLocation, oracleDecayLevel };
		// Check if Phaser game and scene are available via the ref
		if (
			phaserRef.current &&
			phaserRef.current.game &&
			phaserRef.current.scene
		) {
			// Call updateProps on the GameScene instance
			phaserRef.current.scene.updateProps(gameScenePropsRef.current);
		}
	}, [playerLocation, oracleDecayLevel]); // Re-run when playerLocation or oracleDecayLevel changes

	// Example: Increase decay level over time (for testing/demonstration)
	useEffect(() => {
		const decayInterval = setInterval(() => {
			setOracleDecayLevel((prev) => Math.min(1.0, prev + 0.005)); // Slowly increase decay to max 1.0
		}, 1000); // Every second

		return () => clearInterval(decayInterval); // Cleanup on component unmount
	}, []); // Empty dependency array means this effect runs once on mount

	return (
		// Main layout container: Flexbox to stack game and whisper UI vertically
		<div
			style={{
				display: 'flex',
				flexDirection: 'column', // Arrange children in a column
				justifyContent: 'flex-start', // Align content to the top
				alignItems: 'center', // Center children horizontally
				height: '100vh', // Take full viewport height
				width: '100vw', // Take full viewport width
				backgroundColor: '#000', // Solid black background for the whole page
				overflow: 'hidden', // Prevent scrolling if content overflows
			}}
		>
			{/* Phaser Game Container: Takes available vertical space */}
			<div
				id="game-container"
				style={{
					width: '100%',
					flexGrow: 1, // Allows this div to expand and fill available space
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					position: 'relative', // Necessary for Phaser's canvas positioning
					zIndex: 1, // Ensure Phaser game is visually above any potential default lower z-index elements
				}}
			>
				{/* The PhaserGame component, dynamically loaded */}
				<PhaserGame
					ref={phaserRef} // Pass the ref to get access to the Phaser game instance
					currentSceneProps={gameScenePropsRef.current} // Pass current state as props
					onGameEvent={handleGameEvent} // Pass the event callback
				/>
			</div>

			{/* Whisper UI Container: Fixed height area at the bottom */}
			<div
				style={{
					width: '100%',
					maxHeight: '30vh', // Limit height to 30% of viewport height
					minHeight: '100px', // Ensure a minimum height for visibility
					overflowY: 'auto', // Add scrollbar if whispers exceed maxHeight
					backgroundColor: '#1a1a1a', // Dark background for the whisper area
					color: '#00ff00', // Green text for whispers
					padding: '10px 20px',
					borderTop: '1px solid #00ff00', // A subtle green line above
					boxSizing: 'border-box', // Include padding and border in width/height calculation
					position: 'relative',
					zIndex: 2, // Ensure whisper UI is above the game if needed
				}}
			>
				<Whisper whispers={whispers} />
			</div>
		</div>
	);
}
