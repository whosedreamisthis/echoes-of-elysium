// src/components/phaser-game.tsx
'use client';

import React, { useRef, useEffect } from 'react';
import * as Phaser from 'phaser'; // CORRECT
// Define your Phaser Scene(s) here or import them
// We'll put our game logic into a dedicated Scene class
class GameScene extends Phaser.Scene {
	player!: Phaser.GameObjects.Rectangle;
	currentRoomGraphics!: Phaser.GameObjects.Graphics;
	decayOverlay!: Phaser.GameObjects.Graphics;
	puzzleElement!: Phaser.GameObjects.Rectangle;
	gameEventCallback: (type: string, payload?: any) => void;
	playerLocation: string;
	oracleDecayLevel: number;

	constructor(callback: (type: string, payload?: any) => void) {
		super('GameScene');
		this.gameEventCallback = callback; // Callback to notify React
		this.playerLocation = 'starting_chamber'; // Initial state
		this.oracleDecayLevel = 0.0;
	}

	// Method to update props from React
	updateProps(newProps: {
		playerLocation: string;
		oracleDecayLevel: number;
	}) {
		this.playerLocation = newProps.playerLocation;
		this.oracleDecayLevel = newProps.oracleDecayLevel;
		this.drawRoom(); // Redraw scene when location changes
		this.updateDecayOverlay(); // Update decay visual
	}

	preload() {
		// No asset loading initially! We'll draw everything with graphics primitives.
		// If you add simple image assets later, they go here.
	}

	create() {
		this.cameras.main.setBackgroundColor('#1a1a1a'); // Default background

		this.player = this.add.rectangle(
			(this.game.config.width as number) / 2,
			(this.game.config.height as number) / 2,
			20,
			20,
			0xffffff // White player square
		);

		this.currentRoomGraphics = this.add.graphics();
		this.decayOverlay = this.add.graphics(); // For visual decay effects

		this.drawRoom(); // Initial room draw

		// Setup input for movement (example: arrow keys)
		this.input.keyboard?.on('keydown-LEFT', () => {
			this.player.x -= 10;
			this.updatePlayerVisual();
		});
		this.input.keyboard?.on('keydown-RIGHT', () => {
			this.player.x += 10;
			this.updatePlayerVisual();
		});
		this.input.keyboard?.on('keydown-UP', () => {
			this.player.y -= 10;
			this.updatePlayerVisual();
		});
		this.input.keyboard?.on('keydown-DOWN', () => {
			this.player.y += 10;
			this.updatePlayerVisual();
		});

		// Simple puzzle element interaction
		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			if (
				this.puzzleElement &&
				this.puzzleElement.getBounds().contains(pointer.x, pointer.y)
			) {
				this.gameEventCallback('puzzleSolved', {
					puzzleId: 'starting_chamber_panel',
					newLocation: 'corrupted_archive',
				});
			}
		});
	}

	update() {
		// Game loop updates go here (e.g., player movement, collision, animations)
		// The player movement is currently handled by keydown events for simplicity
		// More complex movement would be in update()
	}

	// --- Procedural Generation & Drawing ---
	drawRoom() {
		this.currentRoomGraphics.clear(); // Clear previous room
		this.decayOverlay.clear(); // Clear previous decay effects

		switch (this.playerLocation) {
			case 'starting_chamber':
				this.cameras.main.setBackgroundColor('#1a1a1a');
				this.drawStartingChamber();
				break;
			case 'corrupted_archive':
				this.cameras.main.setBackgroundColor('#330033'); // Dark purple
				this.drawCorruptedArchive();
				break;
			// Add more cases for different room types
			default:
				this.cameras.main.setBackgroundColor('#000000');
				// Fallback or empty room
				break;
		}
		this.updatePlayerVisual();
		this.updateDecayOverlay(); // Apply decay after drawing base room
	}

	drawStartingChamber() {
		const { width, height } = this.sys.game.canvas;
		const roomWidth = width * 0.7;
		const roomHeight = height * 0.7;
		const x = (width - roomWidth) / 2;
		const y = (height - roomHeight) / 2;

		// Outer walls
		this.currentRoomGraphics.lineStyle(4, 0x00ff00, 1); // Green glowing lines
		this.currentRoomGraphics.strokeRect(x, y, roomWidth, roomHeight);

		// Some internal procedural elements
		this.currentRoomGraphics.lineStyle(2, 0x00aa00, 0.8);
		this.currentRoomGraphics.strokeRect(
			x + 50,
			y + 50,
			roomWidth - 100,
			roomHeight - 100
		);

		// Procedural "corrupted" panel (interactive puzzle element)
		const panelX = x + roomWidth * 0.7;
		const panelY = y + roomHeight * 0.3;
		const panelSize = 60;
		this.puzzleElement = this.add.rectangle(
			panelX + panelSize / 2,
			panelY + panelSize / 2,
			panelSize,
			panelSize,
			0xff00ff
		); // Magenta
		this.puzzleElement.setInteractive(); // Make it clickable
		this.puzzleElement.setName('starting_chamber_panel');
	}

	drawCorruptedArchive() {
		const { width, height } = this.sys.game.canvas;

		this.currentRoomGraphics.lineStyle(2, 0x880088, 0.7); // Purple lines
		for (let i = 0; i < 20; i++) {
			this.currentRoomGraphics.strokeRect(
				Phaser.Math.Between(0, width - 50),
				Phaser.Math.Between(0, height - 50),
				Phaser.Math.Between(20, 100),
				Phaser.Math.Between(20, 100)
			);
		}
		// Example: A "data stream" effect
		this.currentRoomGraphics.lineStyle(1, 0x00ffff, 0.5); // Cyan
		for (let i = 0; i < 5; i++) {
			this.currentRoomGraphics.beginPath();
			this.currentRoomGraphics.moveTo(0, Phaser.Math.Between(0, height));
			this.currentRoomGraphics.quadraticCurveTo(
				Phaser.Math.Between(width * 0.2, width * 0.8),
				Phaser.Math.Between(0, height),
				width,
				Phaser.Math.Between(0, height)
			);
			this.currentRoomGraphics.stroke();
		}
	}

	updatePlayerVisual() {
		// Ensure player is visible and on top
		this.children.bringToTop(this.player);
	}

	updateDecayOverlay() {
		this.decayOverlay.clear();
		// Example: Apply a "glitch" overlay based on oracleDecayLevel
		if (this.oracleDecayLevel > 0) {
			const { width, height } = this.sys.game.canvas;
			this.decayOverlay.setBlendMode(Phaser.BlendModes.SCREEN); // Or MULTIPLY, ADD, etc.
			this.decayOverlay.fillStyle(0xffffff, this.oracleDecayLevel * 0.1); // Subtle white tint

			// Random flickering rectangles
			for (let i = 0; i < this.oracleDecayLevel * 50; i++) {
				this.decayOverlay.fillRect(
					Phaser.Math.Between(0, width),
					Phaser.Math.Between(0, height),
					Phaser.Math.Between(1, 10),
					Phaser.Math.Between(1, 10)
				);
			}
			// Random scanlines
			this.decayOverlay.lineStyle(
				1,
				0xffffff,
				this.oracleDecayLevel * 0.2
			);
			for (let i = 0; i < this.oracleDecayLevel * 10; i++) {
				const y = Phaser.Math.Between(0, height);
				this.decayOverlay.beginPath();
				this.decayOverlay.moveTo(0, y);
				this.decayOverlay.lineTo(width, y);
				this.decayOverlay.stroke();
			}
		}
	}
}

interface PhaserGameProps {
	onGameEvent: (type: string, payload?: any) => void;
	playerLocation: string;
	oracleDecayLevel: number;
}

const PhaserGame: React.FC<PhaserGameProps> = ({
	onGameEvent,
	playerLocation,
	oracleDecayLevel,
}) => {
	const gameContainerRef = useRef<HTMLDivElement>(null);
	const phaserGameInstance = useRef<Phaser.Game | null>(null);
	const gameSceneInstance = useRef<GameScene | null>(null); // Ref to the scene instance

	useEffect(() => {
		if (gameContainerRef.current && !phaserGameInstance.current) {
			const config: Phaser.Types.Core.GameConfig = {
				type: Phaser.AUTO,
				parent: gameContainerRef.current, // Attach to this div
				width: window.innerWidth,
				height: window.innerHeight,
				scene: new GameScene(onGameEvent), // Pass callback to scene
				scale: {
					mode: Phaser.Scale.RESIZE, // Make Phaser canvas resize with window
					autoCenter: Phaser.Scale.CENTER_BOTH,
				},
				// Optionally add pixel art scaling if needed
				render: {
					pixelArt: true, // For crisp pixel art if you go that route
				},
			};

			const game = new Phaser.Game(config);
			phaserGameInstance.current = game;
			gameSceneInstance.current = game.scene.getScene(
				'GameScene'
			) as GameScene;

			// Ensure scene gets initial props
			gameSceneInstance.current?.updateProps({
				playerLocation,
				oracleDecayLevel,
			});

			// Handle window resize for Phaser canvas
			const handleResize = () => {
				if (phaserGameInstance.current) {
					phaserGameInstance.current.scale.resize(
						window.innerWidth,
						window.innerHeight
					);
					// Also manually tell the scene to redraw if necessary
					gameSceneInstance.current?.drawRoom();
				}
			};
			window.addEventListener('resize', handleResize);

			return () => {
				window.removeEventListener('resize', handleResize);
				if (phaserGameInstance.current) {
					phaserGameInstance.current.destroy(true); // Clean up Phaser instance
					phaserGameInstance.current = null;
					gameSceneInstance.current = null;
				}
			};
		}
	}, []); // Run once on mount

	// Update Phaser Scene props when React props change
	useEffect(() => {
		if (gameSceneInstance.current) {
			gameSceneInstance.current.updateProps({
				playerLocation,
				oracleDecayLevel,
			});
		}
	}, [playerLocation, oracleDecayLevel]); // Dependencies for this effect

	return (
		<div
			ref={gameContainerRef}
			id="phaser-game-container"
			style={{
				width: '100vw',
				height: '100vh',
				position: 'absolute',
				top: 0,
				left: 0,
			}}
		/>
	);
};

export default PhaserGame;
