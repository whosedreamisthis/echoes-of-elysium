// src/components/whisper.tsx

import React, { useState, useEffect } from 'react';

interface WhisperProps {
	whispers: string[];
}

const Whisper: React.FC<WhisperProps> = ({ whispers }) => {
	const [displayedWhisper, setDisplayedWhisper] = useState('');
	const [currentWhisperIndex, setCurrentWhisperIndex] = useState(-1);
	const [charIndex, setCharIndex] = useState(0);

	// Effect to handle new whispers and reset typing animation
	useEffect(() => {
		if (
			whispers.length > 0 &&
			whispers.length - 1 !== currentWhisperIndex
		) {
			setCurrentWhisperIndex(whispers.length - 1); // Point to the latest whisper
			setDisplayedWhisper(''); // Clear displayed text
			setCharIndex(0); // Reset char index for typing effect
		}
	}, [whispers, currentWhisperIndex]);

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
			}, 50); // Adjust typing speed here (milliseconds per character)

			return () => clearTimeout(timer); // Cleanup timeout on unmount or re-render
		}
	}, [currentWhisperIndex, charIndex, whispers]);

	// If there are no whispers yet, show the "Awaiting data" message
	if (whispers.length === 0 && displayedWhisper === '') {
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
					minHeight: '100px', // Maintain some height
					display: 'flex',
					alignItems: 'center', // Vertically center the text
					justifyContent: 'center', // Horizontally center the text
					boxSizing: 'border-box',
				}}
			>
				<p style={{ color: '#888', fontStyle: 'italic' }}>
					Oracle: System Initialized. Awaiting Input...
				</p>
			</div>
		);
	}

	// Display the typing whisper
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
				minHeight: '100px', // Keep consistent height
				display: 'flex',
				alignItems: 'flex-start', // Align text to top
				boxSizing: 'border-box',
				// REMOVED: overflowY: 'auto'
				// REMOVED: maxHeight
			}}
		>
			<p style={{ marginBottom: '5px', color: '#00ff00' }}>
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
			{/* Add a CSS animation for the blinking caret */}
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
