// src/components/whisper.tsx

import React, { useState, useEffect } from 'react';

interface WhisperProps {
	whispers: string[];
}

const Whisper: React.FC<WhisperProps> = ({ whispers }) => {
	const [displayedWhisper, setDisplayedWhisper] = useState('');
	const [pastWhispers, setPastWhispers] = useState<string[]>([]);
	const [currentWhisperIndex, setCurrentWhisperIndex] = useState(-1);
	const [charIndex, setCharIndex] = useState(0);

	// Effect to handle new whispers and reset typing animation
	useEffect(() => {
		if (
			whispers.length > 0 &&
			whispers.length - 1 !== currentWhisperIndex
		) {
			if (
				currentWhisperIndex >= 0 &&
				displayedWhisper.length === whispers[currentWhisperIndex].length
			) {
				setPastWhispers((prev) => {
					const newPast = [...prev, whispers[currentWhisperIndex]];
					return newPast.slice(Math.max(newPast.length - 2, 0)); // Keep only the last 2 completed messages
				});
			}

			setCurrentWhisperIndex(whispers.length - 1);
			setDisplayedWhisper('');
			setCharIndex(0);
		}
	}, [whispers, currentWhisperIndex, displayedWhisper.length]);

	// Effect for the typing animation
	useEffect(() => {
		if (
			currentWhisperIndex >= 0 &&
			charIndex < whispers[currentWhisperIndex].length
		) {
			const timer = setTimeout(() => {
				setDisplayedWhisper(
					(prev) => prev + whispers[currentWhisperIndex][charIndex]
				);
				setCharIndex((prev) => prev + 1);
			}, 50);

			return () => clearTimeout(timer);
		} else if (
			currentWhisperIndex >= 0 &&
			charIndex === whispers[currentWhisperIndex].length
		) {
			// When typing is complete for the current message
			setPastWhispers((prev) => {
				const newPast = [...prev, whispers[currentWhisperIndex]];
				return newPast.slice(Math.max(newPast.length - 2, 0));
			});
			setCurrentWhisperIndex(-1); // Mark as no active whisper typing
			setDisplayedWhisper(''); // Clear displayed whisper to avoid duplication
		}
	}, [currentWhisperIndex, charIndex, whispers]);

	// If no whispers are available yet, show the initial "Awaiting input" message
	if (
		whispers.length === 0 &&
		displayedWhisper === '' &&
		pastWhispers.length === 0
	) {
		return (
			<div
				style={{
					fontFamily: 'monospace',
					fontSize: '14px',
					lineHeight: '1.4',
					backgroundColor: '#1a1a1a',
					color: '#00ff00',
					padding: '10px 20px',
					borderTop: '1px solid #00ff00',
					minHeight: '100px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					boxSizing: 'border-box',
				}}
			>
				<p style={{ color: '#888', fontStyle: 'italic' }}>
					Oracle: System Initialized. Awaiting Input...
				</p>
			</div>
		);
	}

	// Render the current typing whisper and past whispers
	return (
		<div
			style={{
				fontFamily: 'monospace',
				fontSize: '14px',
				lineHeight: '1.4',
				backgroundColor: '#1a1a1a',
				color: '#00ff00',
				padding: '10px 20px',
				borderTop: '1px solid #00ff00',
				minHeight: '100px',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				boxSizing: 'border-box',
				justifyContent: 'flex-end',
			}}
		>
			{/* Render past whispers with decreasing opacity */}
			{pastWhispers.map((pastWhisper, index) => (
				<p
					key={`past-${index}`}
					style={{
						marginBottom: '5px',
						color: '#00cc00', // A slightly dimmer green for past text
						opacity:
							((index + 1) / (pastWhispers.length + 1)) * 0.7 +
							0.3, // Calculate opacity
						transition: 'opacity 0.5s ease-out', // Smooth transition for opacity
					}}
				>
					{pastWhisper}
				</p>
			))}

			{/* Render current typing whisper */}
			{displayedWhisper && (
				<p
					style={{
						marginBottom: '5px',
						color: '#00ff00',
						whiteSpace: 'pre-wrap',
					}}
				>
					{displayedWhisper}
					{/* Optional: Add a blinking cursor effect */}
					{charIndex < whispers[currentWhisperIndex]?.length && (
						<span
							style={{
								animation: 'blink-caret .75s step-end infinite',
								marginLeft: '2px',
							}}
						>
							|
						</span>
					)}
				</p>
			)}

			<style jsx>{`
				@keyframes blink-caret {
					from,
					to {
						border-color: transparent;
					}
					50% {
						border-color: #00ff00;
					}
				}
			`}</style>
		</div>
	);
};

export default Whisper;
