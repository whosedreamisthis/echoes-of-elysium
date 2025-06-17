// src/components/Hud.tsx
import React from 'react';

interface HudProps {
	whisper: string;
	onLoreRequest: () => void;
	// ... other HUD elements
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
				pointerEvents: 'none', // Allow clicks to pass through to 3D canvas
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-end',
				alignItems: 'center',
				padding: '20px',
				color: 'white',
				textShadow: '1px 1px 2px black',
				zIndex: 10,
			}}
		>
			<div
				style={{
					backgroundColor: 'rgba(0,0,0,0.7)',
					padding: '15px',
					borderRadius: '8px',
					maxWidth: '600px',
					marginBottom: '20px',
					pointerEvents: 'auto', // Make this div clickable
				}}
			>
				<p style={{ fontStyle: 'italic', fontSize: '1.1em' }}>
					Oracle Whisper: {whisper}
				</p>
				<button
					onClick={onLoreRequest}
					style={{
						marginTop: '10px',
						padding: '8px 15px',
						backgroundColor: '#4CAF50',
						color: 'white',
						border: 'none',
						borderRadius: '5px',
						cursor: 'pointer',
						pointerEvents: 'auto',
					}}
				>
					Seek More Whispers
				</button>
			</div>
			{/* Other HUD elements */}
		</div>
	);
}
