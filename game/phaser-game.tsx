// src/game/phaser-game.tsx
'use client'; // This directive is crucial for client-side components in Next.js App Router

import React, {
	useRef,
	useEffect,
	forwardRef,
	useImperativeHandle,
} from 'react';
import * as Phaser from 'phaser'; // Correct way to import Phaser (named export)
import GameScene from './scenes/game-scene'; // Your Phaser scene

// Define the interface for the ref that the parent component (GamePage) will receive
export interface PhaserGameRef {
	game: Phaser.Game | null;
	scene: GameScene | null; // A direct reference to the active GameScene
}

// Define the interface for props passed from React to this Phaser component
interface PhaserGameProps {
	currentSceneProps: {
		playerLocation: string;
		oracleDecayLevel: number;
	};
	onGameEvent: (type: string, payload?: any) => void;
}

// Use forwardRef to allow the parent component (GamePage) to get a ref to the internal Phaser game instance
const PhaserGameComponent = forwardRef<PhaserGameRef, PhaserGameProps>(
	({ currentSceneProps, onGameEvent }, ref) => {
		const gameRef = useRef<Phaser.Game | null>(null); // Internal ref to hold the Phaser.Game instance

		// useImperativeHandle allows the parent to access specific methods/properties of this component's ref
		useImperativeHandle(ref, () => ({
			game: gameRef.current,
			scene: gameRef.current?.scene.getScene(
				'GameScene'
			) as GameScene | null, // Cast to GameScene type
		}));

		// useEffect hook to initialize and clean up the Phaser game
		useEffect(() => {
			// If a game instance already exists (e.g., due to hot module reloading), destroy it cleanly
			if (gameRef.current) {
				gameRef.current.destroy(true);
				gameRef.current = null;
			}

			// Phaser game configuration
			const config: Phaser.Types.Core.GameConfig = {
				type: Phaser.AUTO, // Automatically detect WebGL or Canvas
				parent: 'game-container', // The ID of the HTML element where the canvas will be injected
				backgroundColor: '#000000', // Default background color (can be overridden by scene)
				scale: {
					mode: Phaser.Scale.RESIZE, // Make the game canvas resize with its parent container
					autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game content within the canvas
					width: '100%', // Use 100% of parent width
					height: '100%', // Use 100% of parent height
				},
				physics: {
					default: 'arcade', // Use Arcade Physics
					arcade: {
						debug: false, // Set to true for visual debugging of physics bodies
					},
				},
				scene: [], // Initialize with an empty array; we'll add the scene explicitly
				fps: {
					target: 60, // Target 60 frames per second
					forceSetTimeOut: true, // Ensure consistent FPS
				},
			};

			// Create a new Phaser game instance
			const game = new Phaser.Game(config);
			gameRef.current = game; // Store the game instance in the ref

			// Add and start the GameScene immediately
			// Pass the onGameEvent callback to the scene's constructor
			game.scene.add('GameScene', new GameScene(onGameEvent), true);

			// Get a direct reference to the GameScene instance for external interaction
			const gameScene = game.scene.getScene('GameScene') as GameScene;

			// Pass initial props to the scene *after* it's created and running
			if (gameScene && 'updateProps' in gameScene) {
				gameScene.updateProps(currentSceneProps);
			}

			// Cleanup function: runs when the component unmounts or effect re-runs
			return () => {
				if (gameRef.current) {
					gameRef.current.destroy(true); // Destroy the Phaser game instance cleanly
					gameRef.current = null;
				}
			};
		}, []); // Empty dependency array ensures this effect runs only once on mount

		// This React component itself doesn't render anything visible directly.
		// Phaser takes over the `game-container` div and injects its canvas there.
		return (
			<div id="game-container" style={{ width: '100%', height: '100%' }}>
				{/* Phaser will inject its canvas into this div */}
			</div>
		);
	}
);

// Assign a display name for better debugging in React DevTools
PhaserGameComponent.displayName = 'PhaserGame';

// Export as a default export for easier dynamic importing in Next.js
export default PhaserGameComponent;
