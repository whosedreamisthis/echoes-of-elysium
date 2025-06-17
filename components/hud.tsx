// src/components/hud.tsx

import React from 'react';

interface HudProps {
	whisper: string; // The Oracle's current whisper
	onLoreRequest: () => void; // Callback to request more lore
}

export default function Hud({ whisper, onLoreRequest }: HudProps) {
	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				pointerEvents: 'none', // Allows mouse events to pass through to the Phaser canvas below
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-end', // Position content at the bottom
				alignItems: 'center', // Center horizontally
				padding: '20px',
				color: 'white',
				fontFamily: 'monospace, sans-serif', // Use a monospaced font for a digital feel
				textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
				zIndex: 10, // Ensure HUD is on top of Phaser canvas
				boxSizing: 'border-box', // Include padding in element's total width and height
			}}
		>
			{/* Oracle Whisper Display */}
			<div
				style={{
					backgroundColor: 'rgba(0,0,0,0.7)', // Semi-transparent black background
					border: '1px solid rgba(0,255,0,0.5)', // Green border for data-like feel
					padding: '15px',
					borderRadius: '8px',
					maxWidth: '600px', // Limit width for readability
					marginBottom: '20px',
					pointerEvents: 'auto', // Make this div clickable/interactive
					textAlign: 'center',
					minHeight: '80px', // Give it a consistent minimum height
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					boxShadow: '0 0 10px rgba(0,255,0,0.3)', // Subtle glow
				}}
			>
				<p
					style={{
						fontStyle: 'italic',
						fontSize: '1.1em',
						margin: 0,
					}}
				>
					{whisper}
				</p>
				<button
					onClick={onLoreRequest}
					style={{
						marginTop: '15px',
						padding: '8px 20px',
						backgroundColor: '#004400', // Darker green button
						color: '#00ff00', // Bright green text
						border: '1px solid #00ff00',
						borderRadius: '5px',
						cursor: 'pointer',
						pointerEvents: 'auto', // Make the button clickable
						fontSize: '0.9em',
						fontFamily: 'inherit',
						boxShadow: '0 0 5px rgba(0,255,0,0.5)',
						transition: 'background-color 0.2s, box-shadow 0.2s',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = '#006600';
						e.currentTarget.style.boxShadow =
							'0 0 15px rgba(0,255,0,0.8)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = '#004400';
						e.currentTarget.style.boxShadow =
							'0 0 5px rgba(0,255,0,0.5)';
					}}
				>
					Seek More Whispers
				</button>
			</div>
			{/* You can add more HUD elements here (e.g., inventory, mini-map) */}
		</div>
	);
}
