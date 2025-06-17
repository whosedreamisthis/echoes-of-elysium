// src/game/scenes/game-scene.tsx

import * as Phaser from 'phaser'; // Correct way to import Phaser

// --- Define types for Room Configuration ---
interface RoomExit {
	direction: 'north' | 'south' | 'east' | 'west' | 'secret';
	toRoom: string;
	x: number; // Relative x position (0.0 to 1.0)
	y: number; // Relative y position (0.0 to 1.0)
	width: number; // Relative width (0.0 to 1.0)
	height: number; // Relative height (0.0 to 1.0)
}

interface RoomConfig {
	name: string;
	backgroundColor: number;
	drawFunction: (scene: GameScene, width: number, height: number) => void;
	exits: RoomExit[];
}

// --- Define the room configurations as a constant ---
const roomConfigs: Record<string, RoomConfig> = {
	starting_chamber: {
		name: 'Starting Chamber',
		backgroundColor: 0x1a1a1a, // Dark gray
		drawFunction: (scene, w, h) => scene.drawStartingChamber(w, h),
		exits: [
			{
				direction: 'north',
				toRoom: 'corrupted_archive',
				x: 0.5,
				y: 0,
				width: 0.2,
				height: 0.05,
			}, // Top exit
			{
				direction: 'east',
				toRoom: 'empty_zone_a',
				x: 1,
				y: 0.5,
				width: 0.05,
				height: 0.2,
			}, // Right exit
		],
	},
	corrupted_archive: {
		name: 'Corrupted Archive',
		backgroundColor: 0x330033, // Dark purple
		drawFunction: (scene, w, h) => scene.drawCorruptedArchive(w, h),
		exits: [
			{
				direction: 'south',
				toRoom: 'starting_chamber',
				x: 0.5,
				y: 1,
				width: 0.2,
				height: 0.05,
			}, // Bottom exit
			{
				direction: 'west',
				toRoom: 'empty_zone_b',
				x: 0,
				y: 0.5,
				width: 0.05,
				height: 0.2,
			}, // Left exit
		],
	},
	empty_zone_a: {
		name: 'Empty Zone A',
		backgroundColor: 0x000000, // Black
		drawFunction: (scene, w, h) => scene.drawEmptyRoom(w, h),
		exits: [
			{
				direction: 'west',
				toRoom: 'starting_chamber',
				x: 0,
				y: 0.5,
				width: 0.05,
				height: 0.2,
			}, // Left exit
		],
	},
	empty_zone_b: {
		name: 'Empty Zone B',
		backgroundColor: 0x000000, // Black
		drawFunction: (scene, w, h) => scene.drawEmptyRoom(w, h),
		exits: [
			{
				direction: 'east',
				toRoom: 'corrupted_archive',
				x: 1,
				y: 0.5,
				width: 0.05,
				height: 0.2,
			}, // Right exit
		],
	},
};
// --- END room configurations ---

// Type for game event payloads sent to React
interface GameEventPayload {
	puzzleId?: string;
	newLocation?: string;
	[key: string]: any; // Allow other properties
}
// Type for the callback function received from React
type GameEventCallback = (type: string, payload?: GameEventPayload) => void;

class GameScene extends Phaser.Scene {
	player!: Phaser.GameObjects.Rectangle & {
		body: Phaser.Physics.Arcade.Body;
	}; // Player rectangle with physics body
	cursors!: Phaser.Types.Input.Keyboard.CursorKeys; // Keyboard input
	currentRoomGraphics!: Phaser.GameObjects.Graphics; // Graphics object for drawing room elements
	decayOverlay!: Phaser.GameObjects.Graphics; // Graphics object for the decay visual effect
	puzzleElement?: Phaser.GameObjects.Rectangle; // Optional puzzle element
	exitRects: Phaser.GameObjects.Rectangle[] = []; // Array to hold interactive exit rectangles

	gameEventCallback: GameEventCallback; // Callback to send events to React
	playerLocation: string; // Current room ID
	oracleDecayLevel: number; // Level of oracle decay

	constructor(callback: GameEventCallback) {
		super('GameScene'); // Name of this scene
		this.gameEventCallback = callback;
		this.playerLocation = 'starting_chamber'; // Initial room
		this.oracleDecayLevel = 0.0;
	}

	// Method called from React to update scene properties
	updateProps(newProps: {
		playerLocation: string;
		oracleDecayLevel: number;
	}) {
		if (this.playerLocation !== newProps.playerLocation) {
			this.playerLocation = newProps.playerLocation;
			this.drawRoom(); // Redraw room if location changed
		}
		if (this.oracleDecayLevel !== newProps.oracleDecayLevel) {
			this.oracleDecayLevel = newProps.oracleDecayLevel;
			this.updateDecayOverlay(); // Update decay visual if level changed
		}
	}

	preload() {
		// No assets to preload yet (e.g., images, audio)
	}

	create() {
		this.cameras.main.setBackgroundColor('#1a1a1a'); // Default camera background

		// Initialize graphics objects and set their rendering depth
		this.currentRoomGraphics = this.add.graphics();
		this.currentRoomGraphics.setDepth(10); // Room lines/shapes rendered below player/exits

		this.decayOverlay = this.add.graphics();
		this.decayOverlay.setDepth(50); // Decay effects rendered on top of everything

		// Player object: a white rectangle
		this.player = this.add.rectangle(
			this.scale.width / 2, // Start in the middle of the screen
			this.scale.height / 2,
			20,
			20, // Size
			0xffffff // Color
		) as Phaser.GameObjects.Rectangle & {
			body: Phaser.Physics.Arcade.Body;
		};
		this.player.setDepth(30); // Player rendered above room graphics and exits

		this.physics.world.enable(this.player); // Enable Arcade physics for the player
		this.player.body.setCollideWorldBounds(true); // Player cannot leave the canvas

		this.cursors = this.input.keyboard!.createCursorKeys(); // Setup keyboard cursor keys

		this.drawRoom(); // Initial drawing of the room based on playerLocation

		// Setup pointer (mouse/touch) input for interacting with elements
		// This global listener is less specific than listeners on individual objects
		// We will rely on individual object listeners for exits and puzzles
		// this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
		//   // Check for puzzle element click
		//   if (this.puzzleElement && this.puzzleElement.getBounds().contains(pointer.x, pointer.y)) {
		//     this.gameEventCallback('puzzleSolved', { puzzleId: this.puzzleElement.name, newLocation: 'corrupted_archive' });
		//   }
		//   // Note: Specific exitRect pointerdown listeners will handle room changes
		// });

		// Listen for canvas resize events to redraw room and reposition player
		this.scale.on('resize', this.onResize, this);
	}

	// Handle game canvas resize
	onResize(gameSize: Phaser.Structs.Size) {
		const { width, height } = gameSize;
		this.cameras.main.setSize(width, height); // Update camera size
		this.drawRoom(); // Redraw the room to fit new dimensions
		this.player.setPosition(width / 2, height / 2); // Reposition player to center
	}

	update() {
		this.player.body.setVelocity(0); // Stop player movement by default

		const playerSpeed = 200; // Player movement speed

		// Handle player movement based on cursor keys
		if (this.cursors.left.isDown) {
			this.player.body.setVelocityX(-playerSpeed);
		} else if (this.cursors.right.isDown) {
			this.player.body.setVelocityX(playerSpeed);
		}

		if (this.cursors.up.isDown) {
			this.player.body.setVelocityY(-playerSpeed);
		} else if (this.cursors.down.isDown) {
			this.player.body.setVelocityY(playerSpeed);
		}

		// Change player color based on movement state
		if (
			this.player.body.velocity.x !== 0 ||
			this.player.body.velocity.y !== 0
		) {
			this.player.setFillStyle(0x00ff00); // Green when moving
		} else {
			this.player.setFillStyle(0xffffff); // White when idle
		}
	}

	drawRoom() {
		this.currentRoomGraphics.clear(); // Clear previous room drawings
		this.decayOverlay.clear(); // Clear previous decay overlay

		// Destroy and clear all previous interactive exit rectangles
		this.exitRects.forEach((rect) => rect.destroy());
		this.exitRects = []; // Reset the array

		const { width, height } = this.sys.game.canvas; // Get current canvas dimensions
		const currentRoomConfig = roomConfigs[this.playerLocation]; // Get configuration for the current room

		if (!currentRoomConfig) {
			console.error(
				`Room configuration not found for: ${this.playerLocation}`
			);
			this.cameras.main.setBackgroundColor('#ff0000'); // Show red background on error
			this.drawEmptyRoom(width, height); // Draw a fallback empty room
			return;
		}

		this.cameras.main.setBackgroundColor(currentRoomConfig.backgroundColor); // Set room background color
		currentRoomConfig.drawFunction(this, width, height); // Call the specific drawing function for the room

		// Draw and set up interaction for exits
		currentRoomConfig.exits.forEach((exit) => {
			let exitX = width * exit.x;
			let exitY = height * exit.y;
			const exitWidth = width * exit.width;
			const exitHeight = height * exit.height;

			// Adjust position based on direction to ensure the rectangle is fully on-screen
			// and its origin (0.5, 0.5) correctly positions it.
			switch (exit.direction) {
				case 'north': // Top edge
					exitY += exitHeight / 2; // Shift down by half its height
					break;
				case 'south': // Bottom edge
					exitY -= exitHeight / 2; // Shift up by half its height
					break;
				case 'west': // Left edge
					exitX += exitWidth / 2; // Shift right by half its width
					break;
				case 'east': // Right edge
					exitX -= exitWidth / 2; // Shift left by half its width
					break;
				default:
					// No adjustment needed for 'secret' or other centered exits
					break;
			}

			const exitRect = this.add.rectangle(
				exitX,
				exitY,
				exitWidth,
				exitHeight,
				0xff0000,
				0.7 // DEBUG COLOR: Semi-transparent RED for visibility (0.7 opacity)
			);
			exitRect.setOrigin(0.5, 0.5); // Center the rectangle's pivot point
			exitRect.setInteractive(); // Make the rectangle interactive (receives input events)
			exitRect.setName(exit.toRoom); // Store the target room ID in the rectangle's name property
			exitRect.setDepth(20); // Render above room graphics, below player/puzzle

			// Event listeners for hover effects and clicks on the exit rectangle itself
			exitRect.on('pointerover', () => {
				exitRect.setFillStyle(0x00ff00, 0.9); // Change to more opaque green on hover
				this.game.canvas.style.cursor = 'pointer'; // Change cursor to pointer
				console.log(`Hovering over exit to: ${exit.toRoom}`); // Debug log
			});

			exitRect.on('pointerout', () => {
				exitRect.setFillStyle(0xff0000, 0.7); // Revert to debug red on mouse out
				this.game.canvas.style.cursor = 'default'; // Revert cursor
				console.log(`Mouse left exit to: ${exit.toRoom}`); // Debug log
			});

			exitRect.on('pointerdown', () => {
				// Listener for actual click/tap
				console.log(`Clicked on exit to: ${exit.toRoom}`); // Debug log

				// --- CRITICAL ADDITION: Check if player is near the exit ---
				const playerBounds = this.player.getBounds();
				const exitBounds = exitRect.getBounds();

				// Use Phaser's built-in intersection check or a custom proximity check
				// For now, let's allow clicking anywhere on the exit.
				// Later: We'll add player proximity here. For example:
				// if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, exitBounds)) {
				//     // OR a simpler distance check
				//     const distance = Phaser.Math.Distance.Between(playerBounds.centerX, playerBounds.centerY, exitBounds.centerX, exitBounds.centerY);
				//     if (distance < 100) { // Example: player must be within 100 pixels of exit center
				//         // ... perform room transition ...
				//     } else {
				//         console.log('Player not close enough to exit!');
				//         return; // Do not transition if player is not close
				//     }
				// } else {
				//     return; // Do not transition if player is not close or bounds don't intersect
				// }

				// Perform room transition
				this.playerLocation = exitRect.name; // Use the rectangle's name as the target room ID
				this.drawRoom(); // Redraw the new room
				this.player.setPosition(
					this.scale.width / 2,
					this.scale.height / 2
				); // Recenter player in new room
				this.gameEventCallback('roomChanged', {
					newLocation: this.playerLocation,
				}); // Notify React
			});

			this.exitRects.push(exitRect); // Add the rectangle to our tracking array
		});

		this.updateDecayOverlay(); // Apply decay overlay
	}

	// --- Specific Room Drawing Functions ---

	drawStartingChamber(width: number, height: number) {
		const roomWidth = width * 0.7;
		const roomHeight = height * 0.7;
		const x = (width - roomWidth) / 2;
		const y = (height - roomHeight) / 2;

		this.currentRoomGraphics.lineStyle(4, 0x00ff00, 1); // Green border, 4px thick
		this.currentRoomGraphics.strokeRect(x, y, roomWidth, roomHeight);

		this.currentRoomGraphics.lineStyle(2, 0x00aa00, 0.8); // Darker green inner border
		this.currentRoomGraphics.strokeRect(
			x + 50,
			y + 50,
			roomWidth - 100,
			roomHeight - 100
		);

		// Destroy previous puzzle element if it exists
		if (this.puzzleElement) {
			this.puzzleElement.destroy();
			this.puzzleElement = undefined;
		}

		// Create a new puzzle element (magenta square)
		const panelX = x + roomWidth * 0.7;
		const panelY = y + roomHeight * 0.3;
		const panelSize = 60;
		this.puzzleElement = this.add.rectangle(
			panelX + panelSize / 2,
			panelY + panelSize / 2,
			panelSize,
			panelSize,
			0xff00ff
		);
		this.puzzleElement.setInteractive(); // Make it interactive
		this.puzzleElement.setName('starting_chamber_panel'); // Name for identification
		this.puzzleElement.setDepth(40); // Render above player

		// Puzzle element hover effects
		this.puzzleElement.on('pointerover', () => {
			this.puzzleElement?.setFillStyle(0xff00ff, 0.7); // Semi-transparent magenta on hover
		});

		this.puzzleElement.on('pointerout', () => {
			this.puzzleElement?.setFillStyle(0xff00ff, 1); // Opaque magenta on mouse out
		});
		// Note: Puzzle solving logic is handled in the global pointerdown listener in create()
	}

	drawCorruptedArchive(width: number, height: number) {
		this.currentRoomGraphics.lineStyle(2, 0x880088, 0.7); // Purple lines
		for (let i = 0; i < 30; i++) {
			this.currentRoomGraphics.strokeRect(
				Phaser.Math.Between(0, width - 50),
				Phaser.Math.Between(0, height - 50),
				Phaser.Math.Between(20, 100),
				Phaser.Math.Between(20, 100)
			);
		}
		this.currentRoomGraphics.lineStyle(1, 0x00ffff, 0.5); // Cyan lines
		for (let i = 0; i < 7; i++) {
			this.currentRoomGraphics.beginPath();
			const startY = Phaser.Math.Between(0, height);
			this.currentRoomGraphics.moveTo(0, startY);
			// Changed from quadraticCurveTo to lineTo to fix the error
			this.currentRoomGraphics.lineTo(
				width,
				Phaser.Math.Between(0, height)
			); // Draw a straight line across
			this.currentRoomGraphics.stroke();
		}
		// Destroy puzzle element in this room if it was carried over
		if (this.puzzleElement) {
			this.puzzleElement.destroy();
			this.puzzleElement = undefined;
		}
	}

	drawEmptyRoom(width: number, height: number) {
		this.currentRoomGraphics.lineStyle(1, 0x555555, 0.1); // Faint gray lines
		for (let i = 0; i < 100; i++) {
			const x1 = Phaser.Math.Between(0, width);
			const y1 = Phaser.Math.Between(0, height);
			const x2 = Phaser.Math.Between(0, width);
			const y2 = Phaser.Math.Between(0, height);
			this.currentRoomGraphics.lineBetween(x1, y1, x2, y2);
		}
		// Destroy puzzle element in this room if it was carried over
		if (this.puzzleElement) {
			this.puzzleElement.destroy();
			this.puzzleElement = undefined;
		}
	}

	// Update the visual decay overlay based on oracleDecayLevel
	updateDecayOverlay() {
		this.decayOverlay.clear(); // Clear previous overlay

		if (this.oracleDecayLevel > 0) {
			const { width, height } = this.sys.game.canvas;
			this.decayOverlay.setBlendMode(Phaser.BlendModes.SCREEN); // Screen blend mode for light effects

			// Draw random white rectangles (static noise)
			this.decayOverlay.fillStyle(0xffffff, this.oracleDecayLevel * 0.05); // Opacity scales with decay
			for (let i = 0; i < this.oracleDecayLevel * 100; i++) {
				this.decayOverlay.fillRect(
					Phaser.Math.Between(0, width),
					Phaser.Math.Between(0, height),
					Phaser.Math.Between(1, 15),
					Phaser.Math.Between(1, 15)
				);
			}

			// Draw random white horizontal lines (scanlines/glitch effect)
			this.decayOverlay.lineStyle(
				1,
				0xffffff,
				this.oracleDecayLevel * 0.3
			); // Opacity scales with decay
			for (let i = 0; i < this.oracleDecayLevel * 20; i++) {
				const y = Phaser.Math.Between(0, height);
				this.decayOverlay.beginPath();
				this.decayOverlay.moveTo(0, y);
				this.decayOverlay.lineTo(width, y + Phaser.Math.Between(-2, 2)); // Slightly offset for glitch effect
				this.decayOverlay.stroke();
			}
		}
	}
}

export default GameScene;
