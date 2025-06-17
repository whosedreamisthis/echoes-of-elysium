// src/components/phaser-game.tsx

'use client'; // This component must run on the client-side only

import React, { useRef, useEffect } from 'react';
import * as Phaser from 'phaser'; // Correct import for Phaser as a namespace

// --- Import your Phaser Scene(s) ---
// You will create this file in src/game/scenes/game-scene.tsx
import GameScene from '@/game/scenes/game-scene';

// Define the props that this React component will accept
interface GameEventPayload {
	puzzleId?: string; // Optional, as not all events have a puzzleId
	newLocation?: string; // Optional, as not all events change location
	[key: string]: any; // Allow for other properties, but discourage them
}

interface PhaserGameProps {
	onGameEvent: (type: string, payload?: GameEventPayload) => void; // <-- More specific type
	playerLocation: string;
	oracleDecayLevel: number;
}

const PhaserGame: React.FC<PhaserGameProps> = ({
	onGameEvent,
	playerLocation,
	oracleDecayLevel,
}) => {
	// Ref to hold the DOM element where Phaser will render its canvas
	const gameContainerRef = useRef<HTMLDivElement>(null);
	// Ref to hold the Phaser Game instance itself
	const phaserGameInstance = useRef<Phaser.Game | null>(null);
	// Ref to hold the specific GameScene instance, so we can call methods on it
	const gameSceneInstance = useRef<GameScene | null>(null);

	// useEffect to initialize Phaser game when the component mounts
	useEffect(() => {
		// Ensure the container div exists and Phaser hasn't been initialized yet
		if (gameContainerRef.current && !phaserGameInstance.current) {
			// Define Phaser game configuration
			const config: Phaser.Types.Core.GameConfig = {
				type: Phaser.AUTO, // Auto-detect WebGL or Canvas
				parent: gameContainerRef.current, // Attach the game canvas to this div
				width: window.innerWidth, // Initial width of the canvas
				height: window.innerHeight, // Initial height of the canvas
				// Pass your custom GameScene instance to Phaser.
				// We pass the onGameEvent callback so the scene can notify React.
				scene: new GameScene(onGameEvent),
				scale: {
					mode: Phaser.Scale.RESIZE, // Automatically resize canvas when window resizes
					autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game content
				},
				render: {
					pixelArt: true, // Good for a crisp 2D, no-assets style
				},
				physics: {
					// Add this new physics configuration block
					default: 'arcade', // We're using Arcade Physics
					arcade: {
						debug: false, // Set to true to see collision boxes in dev mode
						gravity: { y: 0, x: 0 },
					},
				},
				// Optionally add physics or other plugins here if needed later
			};

			// Create a new Phaser Game instance
			const game = new Phaser.Game(config);
			phaserGameInstance.current = game; // Store the game instance
			// Get a reference to your custom scene after it's added to the game
			gameSceneInstance.current = game.scene.getScene(
				'GameScene'
			) as GameScene;

			// Ensure the scene gets the initial props immediately after creation
			gameSceneInstance.current?.updateProps({
				playerLocation,
				oracleDecayLevel,
			});

			// Add event listener for window resize to manually handle Phaser's scale resize
			const handleResize = () => {
				if (phaserGameInstance.current) {
					phaserGameInstance.current.scale.resize(
						window.innerWidth,
						window.innerHeight
					);
					// Manually tell the scene to redraw if its internal dimensions need recalculation
					gameSceneInstance.current?.drawRoom();
				}
			};
			window.addEventListener('resize', handleResize);

			// Cleanup function: Destroy Phaser game and remove event listener when component unmounts
			return () => {
				window.removeEventListener('resize', handleResize);
				if (phaserGameInstance.current) {
					phaserGameInstance.current.destroy(true); // Destroy game, remove canvas
					phaserGameInstance.current = null;
					gameSceneInstance.current = null;
				}
			};
		}
	}, []); // Empty dependency array: runs once on mount and cleans up on unmount

	// useEffect to update Phaser Scene props when React props change
	useEffect(() => {
		if (gameSceneInstance.current) {
			// Call a method on the Phaser scene to update its internal state based on React props
			gameSceneInstance.current.updateProps({
				playerLocation,
				oracleDecayLevel,
			});
		}
	}, [playerLocation, oracleDecayLevel]); // Dependencies: re-run effect when these props change

	return (
		<div
			ref={gameContainerRef}
			id="phaser-game-container" // ID for the Phaser game to attach to
			style={{
				width: '100vw',
				height: '100vh',
				position: 'absolute',
				top: 0,
				left: 0,
				// Ensure this div takes up the full screen and is positioned correctly
			}}
		/>
	);
};

export default PhaserGame;
