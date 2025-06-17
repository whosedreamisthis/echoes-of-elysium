// src/components/GameScene.tsx (Example using HTML Canvas)
'use client'; // Client-side component

import React, { useRef, useEffect } from 'react';

interface GameSceneProps {
	playerLocation: string;
	oracleDecayLevel: number; // Pass down for visual corruption
	onPuzzleSolved: (puzzleId: string) => void;
	// ... other props
}

const GameScene: React.FC<GameSceneProps> = ({
	playerLocation,
	oracleDecayLevel,
	onPuzzleSolved,
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Set canvas dimensions (responsive handling will be more complex)
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		let animationFrameId: number;

		const render = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear frame

			// --- Draw based on player location and Oracle decay ---
			ctx.save(); // Save current drawing state

			// Apply a "decay" effect based on oracleDecayLevel
			// e.g., increasing transparency, color shifts, line breaks
			ctx.globalAlpha = 1 - oracleDecayLevel * 0.3; // Make things slightly transparent
			ctx.filter = `blur(${oracleDecayLevel * 2}px)`; // Add blur

			if (playerLocation === 'starting_chamber') {
				ctx.fillStyle = '#1a1a1a'; // Dark background
				ctx.fillRect(0, 0, canvas.width, canvas.height);

				// Procedurally draw basic chamber walls (geometric)
				ctx.strokeStyle = '#00ff00'; // Green glowing lines
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.rect(
					canvas.width / 4,
					canvas.height / 4,
					canvas.width / 2,
					canvas.height / 2
				);
				ctx.stroke();

				// Draw a "corrupted" panel
				ctx.fillStyle = `rgba(255, 0, 255, ${1 - oracleDecayLevel})`; // Magenta for corruption
				ctx.fillRect(
					canvas.width / 2 - 50,
					canvas.height / 2 - 50,
					100,
					100
				);

				// Add some "glitch" lines based on decay
				for (let i = 0; i < oracleDecayLevel * 50; i++) {
					ctx.strokeStyle = `rgba(${Math.random() * 255}, ${
						Math.random() * 255
					}, ${Math.random() * 255}, 0.5)`;
					ctx.beginPath();
					ctx.moveTo(
						Math.random() * canvas.width,
						Math.random() * canvas.height
					);
					ctx.lineTo(
						Math.random() * canvas.width,
						Math.random() * canvas.height
					);
					ctx.stroke();
				}

				// Simple player representation
				ctx.fillStyle = 'white';
				ctx.beginPath();
				ctx.arc(
					canvas.width / 2,
					canvas.height / 2,
					10,
					0,
					Math.PI * 2
				);
				ctx.fill();
			} else if (playerLocation === 'new_chamber') {
				// Draw a different procedural scene
				ctx.fillStyle = '#333366'; // Blue-ish background
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.strokeStyle = '#00ffff'; // Cyan lines
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(0, canvas.height / 2);
				ctx.lineTo(canvas.width, canvas.height / 2);
				ctx.stroke();

				// ... more complex generation for new areas
			}

			ctx.restore(); // Restore drawing state

			animationFrameId = requestAnimationFrame(render);
		};

		render(); // Start the animation loop

		// Cleanup on unmount
		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	}, [playerLocation, oracleDecayLevel]); // Redraw when these props change

	// Basic input handling for a puzzle
	const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return;
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Example: If click near the corrupted panel in starting_chamber
		if (
			playerLocation === 'starting_chamber' &&
			x > canvas.width / 2 - 50 &&
			x < canvas.width / 2 + 50 &&
			y > canvas.height / 2 - 50 &&
			y < canvas.height / 2 + 50
		) {
			onPuzzleSolved('starting_panel_puzzle');
		}
	};

	return (
		<canvas
			ref={canvasRef}
			onClick={handleClick}
			style={{ display: 'block', background: 'black' }} // Ensures no default spacing
		/>
	);
};

export default GameScene;
