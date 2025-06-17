// src/game/scenes/game-scene.tsx

import * as Phaser from 'phaser';

// Define a type for the callback function to send events to React
interface GameEventPayload {
	puzzleId?: string;
	newLocation?: string;
	[key: string]: any; // Allows for other properties, but we'll try to be specific
}
type GameEventCallback = (type: string, payload?: GameEventPayload) => void;

// Define your Phaser Scene class
class GameScene extends Phaser.Scene {
	// Properties for game objects and state
	player!: Phaser.GameObjects.Rectangle & {
		body: Phaser.Physics.Arcade.Body;
	}; // Player with physics body
	cursors!: Phaser.Types.Input.Keyboard.CursorKeys; // For arrow key input
	currentRoomGraphics!: Phaser.GameObjects.Graphics; // For drawing room geometry
	decayOverlay!: Phaser.GameObjects.Graphics; // For visual decay effects
	puzzleElement?: Phaser.GameObjects.Rectangle; // Optional interactive element

	// Properties to store state passed from React
	gameEventCallback: GameEventCallback;
	playerLocation: string;
	oracleDecayLevel: number;

	// Constructor: called when the scene is created by Phaser
	constructor(callback: GameEventCallback) {
		super('GameScene'); // Unique key for this scene
		this.gameEventCallback = callback;
		this.playerLocation = 'starting_chamber'; // Initial default location
		this.oracleDecayLevel = 0.0; // Initial default decay
	}

	// Method to update scene properties from React
	updateProps(newProps: {
		playerLocation: string;
		oracleDecayLevel: number;
	}) {
		// Only update if the location has actually changed to avoid unnecessary redraws
		if (this.playerLocation !== newProps.playerLocation) {
			this.playerLocation = newProps.playerLocation;
			this.drawRoom(); // Redraw the entire room when location changes
		}
		// Decay level updates more frequently, so always update and refresh overlay
		if (this.oracleDecayLevel !== newProps.oracleDecayLevel) {
			this.oracleDecayLevel = newProps.oracleDecayLevel;
			this.updateDecayOverlay(); // Update visual decay effects
		}
	}

	preload() {
		// This is where you would load assets (images, sounds, etc.) if you had them.
		// For "no assets," this section remains empty or is used for font loading.
	}

	create() {
		// Set initial background color for the camera
		this.cameras.main.setBackgroundColor('#1a1a1a');

		// Create the player character (a simple white square for now)
		this.player = this.add.rectangle(
			this.scale.width / 2, // Start in the middle of the screen
			this.scale.height / 2,
			20,
			20, // Size
			0xffffff // White color
		);
		this.player.setDepth(1); // Ensure player is drawn above room graphics

		// Enable Arcade Physics for the player object
		this.physics.world.enable(this.player);
		this.player.body.setCollideWorldBounds(true); // Keep player within canvas bounds

		// Create cursor keys object for easy arrow key input
		this.cursors = this.input.keyboard!.createCursorKeys();

		// Create a Graphics object for drawing the current room's static elements
		this.currentRoomGraphics = this.add.graphics();
		this.currentRoomGraphics.setDepth(0); // Draw below player

		// Create a Graphics object for drawing the decay/glitch overlay
		this.decayOverlay = this.add.graphics();
		this.decayOverlay.setDepth(2); // Draw above everything else

		// Initial draw of the room based on the starting player location
		this.drawRoom();

		// Setup pointer (mouse/touch) input for interacting with the puzzle element
		// This global listener catches all pointerdown events.
		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			// Check if the click occurred on the defined puzzle element
			// We are no longer using global pointerover/out, but this global click is fine
			if (
				this.puzzleElement &&
				this.puzzleElement.getBounds().contains(pointer.x, pointer.y)
			) {
				// Notify the React component that a puzzle was solved
				this.gameEventCallback('puzzleSolved', {
					puzzleId: this.puzzleElement.name,
					newLocation: 'corrupted_archive',
				});
			}
		});

		// Listen for resize events from Phaser's scale manager
		this.scale.on('resize', this.onResize, this);
	}

	// onResize method to handle responsive drawing for procedural elements
	onResize(gameSize: Phaser.Structs.Size) {
		const { width, height } = gameSize;
		this.cameras.main.setSize(width, height);
		// Redraw the room to adapt to new dimensions
		this.drawRoom();
		// Reposition player (e.g., keep them centered)
		this.player.setPosition(width / 2, height / 2);
	}

	// The update method runs every frame.
	update() {
		// Set player velocity to zero initially to stop movement if no keys are pressed
		this.player.body.setVelocity(0);

		const playerSpeed = 200; // Define player movement speed

		// Horizontal movement
		if (this.cursors.left.isDown) {
			this.player.body.setVelocityX(-playerSpeed);
		} else if (this.cursors.right.isDown) {
			this.player.body.setVelocityX(playerSpeed);
		}

		// Vertical movement
		if (this.cursors.up.isDown) {
			this.player.body.setVelocityY(-playerSpeed);
		} else if (this.cursors.down.isDown) {
			this.player.body.setVelocityY(playerSpeed);
		}

		// Optional: Visual feedback for when the player is moving
		if (
			this.player.body.velocity.x !== 0 ||
			this.player.body.velocity.y !== 0
		) {
			this.player.setFillStyle(0x00ff00); // Change player color to green when moving
		} else {
			this.player.setFillStyle(0xffffff); // Revert to white when idle
		}
	}

	// --- Procedural Generation & Drawing Functions ---

	drawRoom() {
		this.currentRoomGraphics.clear(); // Clear previous room graphics
		this.decayOverlay.clear(); // Clear decay overlay before redrawing

		// Get current canvas dimensions for responsive drawing
		const { width, height } = this.sys.game.canvas;

		switch (this.playerLocation) {
			case 'starting_chamber':
				this.cameras.main.setBackgroundColor('#1a1a1a'); // Dark background
				this.drawStartingChamber(width, height);
				break;
			case 'corrupted_archive':
				this.cameras.main.setBackgroundColor('#330033'); // Dark purple for archive
				this.drawCorruptedArchive(width, height);
				break;
			// Add more cases for different room types as your game expands
			default:
				this.cameras.main.setBackgroundColor('#000000'); // Black fallback
				this.drawEmptyRoom(width, height);
				break;
		}
		// Always call updateDecayOverlay after drawing the base room
		this.updateDecayOverlay();
	}

	drawStartingChamber(width: number, height: number) {
		// Define room boundaries relative to canvas size
		const roomWidth = width * 0.7;
		const roomHeight = height * 0.7;
		const x = (width - roomWidth) / 2;
		const y = (height - roomHeight) / 2;

		// Draw outer walls with a green glowing effect
		this.currentRoomGraphics.lineStyle(4, 0x00ff00, 1); // Line width, color, alpha
		this.currentRoomGraphics.strokeRect(x, y, roomWidth, roomHeight);

		// Draw some internal structural elements
		this.currentRoomGraphics.lineStyle(2, 0x00aa00, 0.8);
		this.currentRoomGraphics.strokeRect(
			x + 50,
			y + 50,
			roomWidth - 100,
			roomHeight - 100
		);

		// --- IMPORTANT: Destroy and re-create the puzzle element ---
		// Remove previous puzzleElement if it exists before creating a new one
		if (this.puzzleElement) {
			this.puzzleElement.destroy();
			this.puzzleElement = undefined; // Clear the reference
		}

		// Create a "corrupted panel" as a clickable puzzle element
		const panelX = x + roomWidth * 0.7;
		const panelY = y + roomHeight * 0.3;
		const panelSize = 60;
		// Create the rectangle: position is center, so add half size to x, y
		this.puzzleElement = this.add.rectangle(
			panelX + panelSize / 2,
			panelY + panelSize / 2,
			panelSize,
			panelSize,
			0xff00ff
		); // Magenta color
		this.puzzleElement.setInteractive(); // Make it responsive to clicks
		this.puzzleElement.setName('starting_chamber_panel'); // Give it a name for event handling
		this.puzzleElement.setDepth(1); // Ensure it's above room graphics

		// Add pointerover/pointerout events directly to the puzzle element for visual feedback
		this.puzzleElement.on('pointerover', () => {
			this.puzzleElement?.setFillStyle(0xff00ff, 0.7); // Make it slightly transparent/glowy
		});

		this.puzzleElement.on('pointerout', () => {
			this.puzzleElement?.setFillStyle(0xff00ff, 1); // Reset to full opacity
		});
		// --- END puzzle element handling ---
	}

	drawCorruptedArchive(width: number, height: number) {
		// Example of more complex procedural generation for a new room
		this.currentRoomGraphics.lineStyle(2, 0x880088, 0.7); // Purple lines for corrupted data
		for (let i = 0; i < 30; i++) {
			this.currentRoomGraphics.strokeRect(
				Phaser.Math.Between(0, width - 50),
				Phaser.Math.Between(0, height - 50),
				Phaser.Math.Between(20, 100),
				Phaser.Math.Between(20, 100)
			);
		}
		// Draw a "data stream" effect with dynamic curves
		this.currentRoomGraphics.lineStyle(1, 0x00ffff, 0.5); // Cyan
		for (let i = 0; i < 7; i++) {
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
		// Remove puzzle element for this room, or create a new one
		this.puzzleElement?.destroy();
		this.puzzleElement = undefined; // Clear the reference
	}

	drawEmptyRoom(width: number, height: number) {
		this.cameras.main.setBackgroundColor('#000000'); // Pure black
		// Maybe just some faint static for an empty, unrendered area
		this.currentRoomGraphics.lineStyle(1, 0x555555, 0.1);
		for (let i = 0; i < 100; i++) {
			const x1 = Phaser.Math.Between(0, width);
			const y1 = Phaser.Math.Between(0, height);
			const x2 = Phaser.Math.Between(0, width);
			const y2 = Phaser.Math.Between(0, height);
			this.currentRoomGraphics.lineBetween(x1, y1, x2, y2);
		}
		this.puzzleElement?.destroy();
		this.puzzleElement = undefined;
	}

	updateDecayOverlay() {
		this.decayOverlay.clear(); // Clear previous decay effects

		if (this.oracleDecayLevel > 0) {
			const { width, height } = this.sys.game.canvas;
			// Use blend modes to create interesting visual effects
			this.decayOverlay.setBlendMode(Phaser.BlendModes.SCREEN); // or ADD, MULTIPLY, DIFFERENCE

			// General flickering/static effect based on decay level
			this.decayOverlay.fillStyle(0xffffff, this.oracleDecayLevel * 0.05); // Subtle white tint, increases with decay
			for (let i = 0; i < this.oracleDecayLevel * 100; i++) {
				// More glitches with higher decay
				this.decayOverlay.fillRect(
					Phaser.Math.Between(0, width),
					Phaser.Math.Between(0, height),
					Phaser.Math.Between(1, 15), // Random size
					Phaser.Math.Between(1, 15)
				);
			}

			// Random "scanlines" or breaks
			this.decayOverlay.lineStyle(
				1,
				0xffffff,
				this.oracleDecayLevel * 0.3
			);
			for (let i = 0; i < this.oracleDecayLevel * 20; i++) {
				const y = Phaser.Math.Between(0, height);
				this.decayOverlay.beginPath();
				this.decayOverlay.moveTo(0, y);
				this.decayOverlay.lineTo(width, y + Phaser.Math.Between(-2, 2)); // Slightly offset for glitch
				this.decayOverlay.stroke();
			}
		}
	}
}

export default GameScene;
