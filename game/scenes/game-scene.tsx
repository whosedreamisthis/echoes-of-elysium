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
	[key: string]: any;
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

	updateProps(newProps: {
		playerLocation: string;
		oracleDecayLevel: number;
	}) {
		if (this.playerLocation !== newProps.playerLocation) {
			this.playerLocation = newProps.playerLocation;
			this.drawRoom();
		}
		if (this.oracleDecayLevel !== newProps.oracleDecayLevel) {
			this.oracleDecayLevel = newProps.oracleDecayLevel;
			this.updateDecayOverlay();
		}
	}

	preload() {
		// No assets to preload yet
	}

	create() {
		this.cameras.main.setBackgroundColor('#1a1a1a');

		this.currentRoomGraphics = this.add.graphics();
		this.currentRoomGraphics.setDepth(10);

		this.decayOverlay = this.add.graphics();
		this.decayOverlay.setDepth(50);

		this.player = this.add.rectangle(
			this.scale.width / 2,
			this.scale.height / 2,
			20,
			20,
			0xffffff
		) as Phaser.GameObjects.Rectangle & {
			body: Phaser.Physics.Arcade.Body;
		};
		this.player.setDepth(30);

		this.physics.world.enable(this.player);
		this.player.body.setCollideWorldBounds(true);

		this.cursors = this.input.keyboard!.createCursorKeys();

		this.drawRoom();

		this.scale.on('resize', this.onResize, this);
	}

	onResize(gameSize: Phaser.Structs.Size) {
		const { width, height } = gameSize;
		this.cameras.main.setSize(width, height);
		this.drawRoom();
		this.player.setPosition(width / 2, height / 2);
	}

	update() {
		this.player.body.setVelocity(0);

		const playerSpeed = 200;

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

		if (
			this.player.body.velocity.x !== 0 ||
			this.player.body.velocity.y !== 0
		) {
			this.player.setFillStyle(0x00ff00);
		} else {
			this.player.setFillStyle(0xffffff);
		}
	}

	drawRoom() {
		this.currentRoomGraphics.clear();
		this.decayOverlay.clear();

		this.exitRects.forEach((rect) => rect.destroy());
		this.exitRects = [];

		const { width, height } = this.sys.game.canvas;
		const currentRoomConfig = roomConfigs[this.playerLocation];

		if (!currentRoomConfig) {
			console.error(
				`Room configuration not found for: ${this.playerLocation}`
			);
			this.cameras.main.setBackgroundColor('#ff0000');
			this.drawEmptyRoom(width, height);
			return;
		}

		this.cameras.main.setBackgroundColor(currentRoomConfig.backgroundColor);
		currentRoomConfig.drawFunction(this, width, height);

		currentRoomConfig.exits.forEach((exit) => {
			let exitX = width * exit.x;
			let exitY = height * exit.y;
			const exitWidth = width * exit.width;
			const exitHeight = height * exit.height;

			switch (exit.direction) {
				case 'north':
					exitY += exitHeight / 2;
					break;
				case 'south':
					exitY -= exitHeight / 2;
					break;
				case 'west':
					exitX += exitWidth / 2;
					break;
				case 'east':
					exitX -= exitWidth / 2;
					break;
				default:
					break;
			}

			const exitRect = this.add.rectangle(
				exitX,
				exitY,
				exitWidth,
				exitHeight,
				0xff0000,
				0.7
			);
			exitRect.setOrigin(0.5, 0.5);
			exitRect.setInteractive();
			exitRect.setName(exit.toRoom);
			exitRect.setDepth(20);

			exitRect.on('pointerover', () => {
				exitRect.setFillStyle(0x00ff00, 0.9);
				this.game.canvas.style.cursor = 'pointer';
			});

			exitRect.on('pointerout', () => {
				exitRect.setFillStyle(0xff0000, 0.7);
				this.game.canvas.style.cursor = 'default';
			});

			exitRect.on('pointerdown', () => {
				console.log(`Clicked on exit to: ${exit.toRoom}`);

				const playerBounds = this.player.getBounds();
				const exitBounds = exitRect.getBounds();

				// Calculate distance between centers of player and exit
				const distance = Phaser.Math.Distance.Between(
					playerBounds.centerX,
					playerBounds.centerY,
					exitBounds.centerX,
					exitBounds.centerY
				);

				// Define activation distance: e.g., player must be within 3 times its own size from exit center
				const activationDistance =
					Math.max(playerBounds.width, playerBounds.height) * 3;

				if (distance > activationDistance) {
					console.log(
						`Player not close enough to exit! Distance: ${distance.toFixed(
							2
						)}, Required: ${activationDistance.toFixed(2)}`
					);
					this.gameEventCallback('gameFeedback', {
						message: 'Player not close enough to the exit.',
						type: 'error',
					});
					return;
				}

				console.log(
					`Player is close enough to exit. Distance: ${distance.toFixed(
						2
					)}`
				);

				this.playerLocation = exitRect.name;
				this.drawRoom();
				this.player.setPosition(
					this.scale.width / 2,
					this.scale.height / 2
				);
				this.gameEventCallback('roomChanged', {
					newLocation: this.playerLocation,
				});
			});

			this.exitRects.push(exitRect);
		});

		this.updateDecayOverlay();
	}

	drawStartingChamber(width: number, height: number) {
		const roomWidth = width * 0.7;
		const roomHeight = height * 0.7;
		const x = (width - roomWidth) / 2;
		const y = (height - roomHeight) / 2;

		this.currentRoomGraphics.lineStyle(4, 0x00ff00, 1);
		this.currentRoomGraphics.strokeRect(x, y, roomWidth, roomHeight);

		this.currentRoomGraphics.lineStyle(2, 0x00aa00, 0.8);
		this.currentRoomGraphics.strokeRect(
			x + 50,
			y + 50,
			roomWidth - 100,
			roomHeight - 100
		);

		if (this.puzzleElement) {
			this.puzzleElement.destroy();
			this.puzzleElement = undefined;
		}

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
		this.puzzleElement.setInteractive();
		this.puzzleElement.setName('starting_chamber_panel');
		this.puzzleElement.setDepth(40);

		this.puzzleElement.on('pointerover', () => {
			this.puzzleElement?.setFillStyle(0xff00ff, 0.7);
			this.game.canvas.style.cursor = 'pointer';
		});

		this.puzzleElement.on('pointerout', () => {
			this.puzzleElement?.setFillStyle(0xff00ff, 1);
			this.game.canvas.style.cursor = 'default';
		});

		this.puzzleElement.on('pointerdown', () => {
			console.log(`Puzzle element clicked: ${this.puzzleElement?.name}`);
			this.gameEventCallback('puzzleSolved', {
				puzzleId: this.puzzleElement?.name,
				newLocation: 'corrupted_archive',
			});
		});
	}

	drawCorruptedArchive(width: number, height: number) {
		this.currentRoomGraphics.lineStyle(2, 0x880088, 0.7);
		for (let i = 0; i < 30; i++) {
			this.currentRoomGraphics.strokeRect(
				Phaser.Math.Between(0, width - 50),
				Phaser.Math.Between(0, height - 50),
				Phaser.Math.Between(20, 100),
				Phaser.Math.Between(20, 100)
			);
		}
		this.currentRoomGraphics.lineStyle(1, 0x00ffff, 0.5);
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
		if (this.puzzleElement) {
			this.puzzleElement.destroy();
			this.puzzleElement = undefined;
		}
	}

	drawEmptyRoom(width: number, height: number) {
		this.currentRoomGraphics.lineStyle(1, 0x555555, 0.1);
		for (let i = 0; i < 100; i++) {
			const x1 = Phaser.Math.Between(0, width);
			const y1 = Phaser.Math.Between(0, height);
			const x2 = Phaser.Math.Between(0, width);
			const y2 = Phaser.Math.Between(0, height);
			this.currentRoomGraphics.lineBetween(x1, y1, x2, y2);
		}
		if (this.puzzleElement) {
			this.puzzleElement.destroy();
			this.puzzleElement = undefined;
		}
	}

	updateDecayOverlay() {
		this.decayOverlay.clear();

		if (this.oracleDecayLevel > 0) {
			const { width, height } = this.sys.game.canvas;
			this.decayOverlay.setBlendMode(Phaser.BlendModes.SCREEN);

			this.decayOverlay.fillStyle(0xffffff, this.oracleDecayLevel * 0.05);
			for (let i = 0; i < this.oracleDecayLevel * 100; i++) {
				this.decayOverlay.fillRect(
					Phaser.Math.Between(0, width),
					Phaser.Math.Between(0, height),
					Phaser.Math.Between(1, 15),
					Phaser.Math.Between(1, 15)
				);
			}

			this.decayOverlay.lineStyle(
				1,
				0xffffff,
				this.oracleDecayLevel * 0.3
			);
			for (let i = 0; i < this.oracleDecayLevel * 20; i++) {
				const y = Phaser.Math.Between(0, height);
				this.decayOverlay.beginPath();
				this.decayOverlay.moveTo(0, y);
				this.decayOverlay.lineTo(width, y + Phaser.Math.Between(-2, 2));
				this.decayOverlay.stroke();
			}
		}
	}
}

export default GameScene;
