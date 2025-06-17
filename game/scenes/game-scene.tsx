// src/game/scenes/game-scene.tsx

import * as Phaser from 'phaser';

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

const roomConfigs: Record<string, RoomConfig> = {
	starting_chamber: {
		name: 'Starting Chamber',
		backgroundColor: 0x1a1a1a,
		drawFunction: (scene, w, h) => scene.drawStartingChamber(w, h),
		exits: [
			{
				direction: 'north',
				toRoom: 'corrupted_archive',
				x: 0.5,
				y: 0,
				width: 0.2,
				height: 0.05,
			},
			{
				direction: 'east',
				toRoom: 'empty_zone_a',
				x: 1,
				y: 0.5,
				width: 0.05,
				height: 0.2,
			},
		],
	},
	corrupted_archive: {
		name: 'Corrupted Archive',
		backgroundColor: 0x330033,
		drawFunction: (scene, w, h) => scene.drawCorruptedArchive(w, h),
		exits: [
			{
				direction: 'south',
				toRoom: 'starting_chamber',
				x: 0.5,
				y: 1,
				width: 0.2,
				height: 0.05,
			},
			{
				direction: 'west',
				toRoom: 'empty_zone_b',
				x: 0,
				y: 0.5,
				width: 0.05,
				height: 0.2,
			},
		],
	},
	empty_zone_a: {
		name: 'Empty Zone A',
		backgroundColor: 0x000000,
		drawFunction: (scene, w, h) => scene.drawEmptyRoom(w, h),
		exits: [
			{
				direction: 'west',
				toRoom: 'starting_chamber',
				x: 0,
				y: 0.5,
				width: 0.05,
				height: 0.2,
			},
		],
	},
	empty_zone_b: {
		name: 'Empty Zone B',
		backgroundColor: 0x000000,
		drawFunction: (scene, w, h) => scene.drawEmptyRoom(w, h),
		exits: [
			{
				direction: 'east',
				toRoom: 'corrupted_archive',
				x: 1,
				y: 0.5,
				width: 0.05,
				height: 0.2,
			},
		],
	},
};

interface GameEventPayload {
	puzzleId?: string;
	newLocation?: string;
	message?: string;
	type?: string; // For gameFeedback type
	currentDecay?: number; // For decayUpdate type
	[key: string]: any; // Allow for other properties
}
type GameEventCallback = (type: string, payload?: GameEventPayload) => void;

class GameScene extends Phaser.Scene {
	player!: Phaser.GameObjects.Rectangle & {
		body: Phaser.Physics.Arcade.Body;
	};
	cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	currentRoomGraphics!: Phaser.GameObjects.Graphics;
	decayOverlay!: Phaser.GameObjects.Graphics;
	puzzleElement?: Phaser.GameObjects.Rectangle;
	exitRects: Phaser.GameObjects.Rectangle[] = [];

	gameEventCallback: GameEventCallback;
	playerLocation: string;
	oracleDecayLevel: number;

	constructor(callback: GameEventCallback) {
		super('GameScene');
		this.gameEventCallback = callback;
		this.playerLocation = 'starting_chamber';
		this.oracleDecayLevel = 0.0;
	}

	/**
	 * Updates properties from the React component.
	 * Redraws the room if playerLocation changes, and updates decay overlay.
	 */
	updateProps(newProps: {
		playerLocation: string;
		oracleDecayLevel: number;
	}) {
		if (this.playerLocation !== newProps.playerLocation) {
			this.playerLocation = newProps.playerLocation;
			this.drawRoom(); // Redraw the new room when location changes
		}
		if (this.oracleDecayLevel !== newProps.oracleDecayLevel) {
			this.oracleDecayLevel = newProps.oracleDecayLevel;
			this.updateDecayOverlay(); // Update visual decay effect
		}
	}

	preload() {
		// No assets to preload yet, but this is where you'd load images, audio, etc.
	}

	create() {
		// Set initial background color
		this.cameras.main.setBackgroundColor('#1a1a1a');

		// Initialize graphics objects for room elements and decay overlay
		this.currentRoomGraphics = this.add.graphics();
		this.currentRoomGraphics.setDepth(10); // Render below player

		this.decayOverlay = this.add.graphics();
		this.decayOverlay.setDepth(50); // Render above most other elements for overlay effect

		// Create the player rectangle
		this.player = this.add.rectangle(
			this.scale.width / 2, // Start in the horizontal center
			this.scale.height / 2, // Start in the vertical center
			20,
			20, // Player size (width, height)
			0xffffff // White color
		) as Phaser.GameObjects.Rectangle & {
			body: Phaser.Physics.Arcade.Body;
		};
		this.player.setDepth(30); // Render above room graphics, below decay overlay

		// Enable Arcade Physics for the player
		this.physics.world.enable(this.player);
		this.player.body.setCollideWorldBounds(true); // Player cannot move off-screen

		// Set up keyboard input (arrow keys)
		this.cursors = this.input.keyboard!.createCursorKeys();

		// Initial draw of the room
		this.drawRoom();

		// Listen for window resize events to adjust game elements
		this.scale.on('resize', this.onResize, this);
	}

	/**
	 * Handles resizing of the game canvas.
	 * Adjusts camera, redraws room, and repositions player.
	 */
	onResize(gameSize: Phaser.Structs.Size) {
		const { width, height } = gameSize;
		this.cameras.main.setSize(width, height);
		this.drawRoom(); // Redraw room elements based on new size
		this.player.setPosition(width / 2, height / 2); // Recenter player
	}

	/**
	 * Game loop update method. Handles player movement.
	 */
	update() {
		this.player.body.setVelocity(0); // Stop player movement by default

		const playerSpeed = 200; // Speed of the player

		// Apply velocity based on arrow key input
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

	/**
	 * Draws the current room based on playerLocation.
	 * Clears previous room elements and creates new ones.
	 */
	drawRoom() {
		this.currentRoomGraphics.clear(); // Clear all previous room drawings
		this.decayOverlay.clear(); // Clear decay overlay as it will be redrawn by updateDecayOverlay

		// Destroy all previous exit rectangles to prevent duplicates
		this.exitRects.forEach((rect) => rect.destroy());
		this.exitRects = []; // Clear the array

		const { width, height } = this.sys.game.canvas; // Get current canvas dimensions
		const currentRoomConfig = roomConfigs[this.playerLocation]; // Get config for current room

		// Handle case where room config is not found (shouldn't happen if defined)
		if (!currentRoomConfig) {
			console.error(
				`Room configuration not found for: ${this.playerLocation}`
			);
			this.cameras.main.setBackgroundColor('#ff0000'); // Set error background
			this.drawEmptyRoom(width, height); // Draw a generic empty room
			return;
		}

		// Set room background color and call its specific drawing function
		this.cameras.main.setBackgroundColor(currentRoomConfig.backgroundColor);
		currentRoomConfig.drawFunction(this, width, height);

		// Draw exits for the current room
		currentRoomConfig.exits.forEach((exit) => {
			// Calculate absolute pixel coordinates for the exit rectangle
			let exitX = width * exit.x;
			let exitY = height * exit.y;
			const exitWidth = width * exit.width;
			const exitHeight = height * exit.height;

			// Adjust position based on direction to place the center correctly for corners/edges
			switch (exit.direction) {
				case 'north': // Top edge
					exitY += exitHeight / 2;
					break;
				case 'south': // Bottom edge
					exitY -= exitHeight / 2;
					break;
				case 'west': // Left edge
					exitX += exitWidth / 2;
					break;
				case 'east': // Right edge
					exitX -= exitWidth / 2;
					break;
				default:
					break; // No adjustment for 'secret' or center exits
			}

			// Create the exit rectangle game object
			const exitRect = this.add.rectangle(
				exitX,
				exitY,
				exitWidth,
				exitHeight,
				0xff0000,
				0.7 // Red color, semi-transparent
			);
			exitRect.setOrigin(0.5, 0.5); // Set origin to center
			exitRect.setInteractive(); // Make it clickable/hoverable
			exitRect.setName(exit.toRoom); // Store target room name on the object
			exitRect.setDepth(20); // Render above room graphics, below player

			// Add hover effects for the exit rectangle
			exitRect.on('pointerover', () => {
				exitRect.setFillStyle(0x00ff00, 0.9); // Green on hover
				this.game.canvas.style.cursor = 'pointer'; // Change cursor to pointer
			});

			exitRect.on('pointerout', () => {
				exitRect.setFillStyle(0xff0000, 0.7); // Revert to red on mouse out
				this.game.canvas.style.cursor = 'default'; // Revert cursor
			});

			// Add click listener for room transitions
			exitRect.on('pointerdown', () => {
				console.log(`Clicked on exit to: ${exit.toRoom}`);

				const playerBounds = this.player.getBounds(); // Get player's bounding box
				const exitBounds = exitRect.getBounds(); // Get exit's bounding box

				// Create an "expanded" exit bounds to check proximity for player activation
				// This creates a slightly larger rectangle around the exit for the player to enter.
				// We expand it by roughly 1 player's width/height on each side.
				const proximityExitBounds = new Phaser.Geom.Rectangle(
					exitBounds.x - playerBounds.width * 0.7, // Left: shift left by 70% of player width
					exitBounds.y - playerBounds.height * 0.7, // Top: shift up by 70% of player height
					exitBounds.width + playerBounds.width * 1.4, // Width: add 140% of player width (70% on each side)
					exitBounds.height + playerBounds.height * 1.4 // Height: add 140% of player height
				);

				// Check if the player's bounding box overlaps with the expanded exit bounds
				if (
					!Phaser.Geom.Intersects.RectangleToRectangle(
						playerBounds,
						proximityExitBounds
					)
				) {
					console.log(
						`Player not close enough to exit! Player bounds: ${JSON.stringify(
							playerBounds
						)}, Proximity Exit Bounds: ${JSON.stringify(
							proximityExitBounds
						)}`
					);
					// Notify React component that player is too far
					this.gameEventCallback('gameFeedback', {
						message: 'Player not close enough to the exit.',
						type: 'error',
					});
					return; // Prevent room transition
				}

				console.log(
					`Player is close enough to exit (overlap detected).`
				);

				// If close enough, perform room transition
				this.playerLocation = exitRect.name; // Update current room
				this.drawRoom(); // Redraw the new room
				this.player.setPosition(
					this.scale.width / 2,
					this.scale.height / 2
				); // Recenter player in new room
				this.gameEventCallback('roomChanged', {
					newLocation: this.playerLocation,
				}); // Notify React component
			});

			this.exitRects.push(exitRect); // Add to array for management
		});

		this.updateDecayOverlay(); // Ensure decay overlay is redrawn with the room
	}

	/**
	 * Draws the 'Starting Chamber' room layout.
	 */
	drawStartingChamber(width: number, height: number) {
		const roomWidth = width * 0.7;
		const roomHeight = height * 0.7;
		const x = (width - roomWidth) / 2;
		const y = (height - roomHeight) / 2;

		// Outer green border
		this.currentRoomGraphics.lineStyle(4, 0x00ff00, 1);
		this.currentRoomGraphics.strokeRect(x, y, roomWidth, roomHeight);

		// Inner darker green border
		this.currentRoomGraphics.lineStyle(2, 0x00aa00, 0.8);
		this.currentRoomGraphics.strokeRect(
			x + 50,
			y + 50,
			roomWidth - 100,
			roomHeight - 100
		);

		// Destroy existing puzzle element if present (for redraws)
		if (this.puzzleElement) {
			this.puzzleElement.destroy();
			this.puzzleElement = undefined;
		}

		// Create the puzzle element (magenta square)
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
			this.game.canvas.style.cursor = 'pointer'; // Change cursor
		});

		this.puzzleElement.on('pointerout', () => {
			this.puzzleElement?.setFillStyle(0xff00ff, 1); // Opaque magenta on mouse out
			this.game.canvas.style.cursor = 'default'; // Revert cursor
		});

		// Puzzle element click listener
		this.puzzleElement.on('pointerdown', () => {
			console.log(`Puzzle element clicked: ${this.puzzleElement?.name}`);
			// Trigger the puzzleSolved event, indicating the next room is 'corrupted_archive'
			this.gameEventCallback('puzzleSolved', {
				puzzleId: this.puzzleElement?.name,
				newLocation: 'corrupted_archive',
			});
		});
	}

	/**
	 * Draws the 'Corrupted Archive' room layout.
	 */
	drawCorruptedArchive(width: number, height: number) {
		// Draw random corrupted data blocks
		this.currentRoomGraphics.lineStyle(2, 0x880088, 0.7); // Purple lines
		for (let i = 0; i < 30; i++) {
			this.currentRoomGraphics.strokeRect(
				Phaser.Math.Between(0, width - 50),
				Phaser.Math.Between(0, height - 50),
				Phaser.Math.Between(20, 100),
				Phaser.Math.Between(20, 100)
			);
		}
		// Draw glitched lines
		this.currentRoomGraphics.lineStyle(1, 0x00ffff, 0.5); // Cyan lines
		for (let i = 0; i < 7; i++) {
			this.currentRoomGraphics.beginPath();
			const startY = Phaser.Math.Between(0, height);
			this.currentRoomGraphics.moveTo(0, startY);
			this.currentRoomGraphics.lineTo(
				width,
				Phaser.Math.Between(0, height)
			);
			this.currentRoomGraphics.stroke();
		}
		// Ensure puzzle element is not drawn in this room
		if (this.puzzleElement) {
			this.puzzleElement.destroy();
			this.puzzleElement = undefined;
		}
	}

	/**
	 * Draws a generic 'Empty Room' layout.
	 */
	drawEmptyRoom(width: number, height: number) {
		// Draw faint grid lines
		this.currentRoomGraphics.lineStyle(1, 0x555555, 0.1); // Grey, very transparent lines
		for (let i = 0; i < 100; i++) {
			const x1 = Phaser.Math.Between(0, width);
			const y1 = Phaser.Math.Between(0, height);
			const x2 = Phaser.Math.Between(0, width);
			const y2 = Phaser.Math.Between(0, height);
			this.currentRoomGraphics.lineBetween(x1, y1, x2, y2);
		}
		// Ensure puzzle element is not drawn in this room
		if (this.puzzleElement) {
			this.puzzleElement.destroy();
			this.puzzleElement = undefined;
		}
	}

	/**
	 * Updates the visual overlay representing Oracle decay.
	 */
	updateDecayOverlay() {
		this.decayOverlay.clear(); // Clear previous overlay

		if (this.oracleDecayLevel > 0) {
			const { width, height } = this.sys.game.canvas;
			this.decayOverlay.setBlendMode(Phaser.BlendModes.SCREEN); // Lighten effect

			// Draw random white squares/particles (more with higher decay)
			this.decayOverlay.fillStyle(0xffffff, this.oracleDecayLevel * 0.05); // White, transparency scales with decay
			for (let i = 0; i < this.oracleDecayLevel * 100; i++) {
				this.decayOverlay.fillRect(
					Phaser.Math.Between(0, width),
					Phaser.Math.Between(0, height),
					Phaser.Math.Between(1, 15),
					Phaser.Math.Between(1, 15)
				);
			}

			// Draw random static lines (more with higher decay)
			this.decayOverlay.lineStyle(
				1,
				0xffffff,
				this.oracleDecayLevel * 0.3
			); // White, transparency scales with decay
			for (let i = 0; i < this.oracleDecayLevel * 20; i++) {
				const y = Phaser.Math.Between(0, height);
				this.decayOverlay.beginPath();
				this.decayOverlay.moveTo(0, y);
				this.decayOverlay.lineTo(width, y + Phaser.Math.Between(-2, 2)); // Slightly offset line
				this.decayOverlay.stroke();
			}
		}
	}
}

export default GameScene;
