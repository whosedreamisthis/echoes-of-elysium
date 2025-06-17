// src/app/game/page.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Whisper from '@/components/whisper';
import { PhaserGameRef } from '@/game/phaser-game';
import roomDescriptions from '@/data/roomDescriptions.json'; // NEW: Import room descriptions

// Function to simulate corrupting a message based on decay level
const corruptMessage = (message: string, decay: number) => {
	if (decay < 0.1) return message; // No corruption if decay is very low
	let corrupted = '';
	for (let i = 0; i < message.length; i++) {
		// Higher decay, more chance of corruption
		if (Math.random() < decay * 0.7) {
			// Increased corruption chance
			// Replace with random ASCII character or a glitch symbol
			const glitchChars = '█▓▒░#@&$%*+-_=<>?!/\\{}[]()';
			corrupted +=
				glitchChars[Math.floor(Math.random() * glitchChars.length)];
		} else {
			corrupted += message[i];
		}
	}
	return corrupted;
};

const PhaserGame = dynamic(() => import('@/game/phaser-game'), {
	ssr: false,
	// loading: () => <p style={{ color: 'white', textAlign: 'center', padding: '20px' }}>Loading game...</p>,
});

interface GameSceneProps {
	playerLocation: string;
	oracleDecayLevel: number;
}

export default function GamePage() {
	const [whispers, setWhispers] = useState<string[]>([
		'Oracle: System initialized. Awaiting input.',
	]);
	const [playerLocation, setPlayerLocation] =
		useState<string>('starting_chamber');
	const [oracleDecayLevel, setOracleDecayLevel] = useState<number>(0);
	const phaserRef = useRef<PhaserGameRef | null>(null);
	const gameScenePropsRef = useRef<GameSceneProps>({
		playerLocation,
		oracleDecayLevel,
	});

	// Use a ref to track if a room has been entered for the first time
	const hasEnteredRoom = useRef<Record<string, boolean>>({
		starting_chamber: true,
	});

	const handleGameEvent = useCallback(
		(type: string, payload?: any) => {
			if (type === 'puzzleSolved') {
				const { puzzleId, newLocation } = payload;
				console.log(
					`Puzzle Solved: ${puzzleId}. Moving to ${newLocation}.`
				);
				setWhispers((prev) => [
					...prev,
					corruptMessage(
						`Oracle: A circuit hums. The path to the ${newLocation.replace(
							/_/g,
							' '
						)} unravels.`,
						oracleDecayLevel
					),
				]);
				if (newLocation) {
					setPlayerLocation(newLocation);
					// Also trigger room changed message after puzzle solve leads to new room
					const roomDesc =
						roomDescriptions[newLocation] ||
						'A new chamber opens before you.';
					setWhispers((prev) => [
						...prev,
						corruptMessage(`Oracle: ${roomDesc}`, oracleDecayLevel),
					]);
					hasEnteredRoom.current[newLocation] = true; // Mark as entered
				}
			} else if (type === 'roomChanged') {
				const { newLocation } = payload;
				console.log(`Player entered: ${newLocation}`);
				setPlayerLocation(newLocation);

				// Check if this is the first time entering this room
				if (!hasEnteredRoom.current[newLocation]) {
					const roomDesc =
						roomDescriptions[newLocation] ||
						'A new chamber opens before you.';
					setWhispers((prev) => [
						...prev,
						corruptMessage(`Oracle: ${roomDesc}`, oracleDecayLevel),
					]);
					hasEnteredRoom.current[newLocation] = true; // Mark as entered
				} else {
					// For subsequent entries, a simpler message or no message
					setWhispers((prev) => [
						...prev,
						corruptMessage(
							`Oracle: Re-entering the ${newLocation.replace(
								/_/g,
								' '
							)}.`,
							oracleDecayLevel * 0.5
						),
					]); // Less corruption for re-entry
				}
			} else if (type === 'gameFeedback') {
				const { message, type: feedbackType } = payload;
				console.log(`Game Feedback (${feedbackType}): ${message}`);
				setWhispers((prev) => [
					...prev,
					corruptMessage(`Oracle: ${message}`, oracleDecayLevel),
				]);
			} else if (type === 'decayUpdate') {
				// NEW: Handle direct decay updates for Oracle comments
				const { currentDecay } = payload;
				if (currentDecay > 0.3 && currentDecay < 0.31) {
					// Example: Trigger at 30% decay
					setWhispers((prev) => [
						...prev,
						corruptMessage(
							'Oracle: The threads fray. My connection weakens...',
							currentDecay
						),
					]);
				} else if (currentDecay > 0.6 && currentDecay < 0.61) {
					// Example: Trigger at 60% decay
					setWhispers((prev) => [
						...prev,
						corruptMessage(
							'Oracle: !!!SYSTEM INTERFERENCE!!!... Seek the core.',
							currentDecay
						),
					]);
				}
			}
		},
		[oracleDecayLevel]
	); // oracleDecayLevel added to dependencies for corruption logic

	useEffect(() => {
		gameScenePropsRef.current = { playerLocation, oracleDecayLevel };
		if (
			phaserRef.current &&
			phaserRef.current.game &&
			phaserRef.current.scene
		) {
			phaserRef.current.scene.updateProps(gameScenePropsRef.current);
		}
	}, [playerLocation, oracleDecayLevel]);

	// Oracle Decay Level update and trigger for Oracle comments
	useEffect(() => {
		const decayInterval = setInterval(() => {
			setOracleDecayLevel((prev) => {
				const newDecay = Math.min(1.0, prev + 0.005);
				// Trigger decayUpdate event when certain thresholds are crossed
				if (prev < 0.3 && newDecay >= 0.3) {
					handleGameEvent('decayUpdate', { currentDecay: newDecay });
				} else if (prev < 0.6 && newDecay >= 0.6) {
					handleGameEvent('decayUpdate', { currentDecay: newDecay });
				}
				return newDecay;
			});
		}, 1000);

		return () => clearInterval(decayInterval);
	}, [handleGameEvent]); // handleGameEvent added as dependency because it's used inside

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-start',
				alignItems: 'center',
				height: '100vh',
				width: '100vw',
				backgroundColor: '#000',
				overflow: 'hidden',
			}}
		>
			<div
				id="game-container"
				style={{
					width: '100%',
					flexGrow: 1,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					position: 'relative',
					zIndex: 1,
				}}
			>
				<PhaserGame
					ref={phaserRef}
					currentSceneProps={gameScenePropsRef.current}
					onGameEvent={handleGameEvent}
				/>
			</div>

			<div
				style={{
					width: '100%',
					maxHeight: '30vh',
					minHeight: '100px',
					backgroundColor: '#1a1a1a',
					color: '#00ff00',
					padding: '10px 20px',
					borderTop: '1px solid #00ff00',
					boxSizing: 'border-box',
					position: 'relative',
					zIndex: 2,
				}}
			>
				<Whisper whispers={whispers} />
			</div>
		</div>
	);
}
