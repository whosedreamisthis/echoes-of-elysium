// src/components/whisper.tsx

import React from 'react';

interface WhisperProps {
	whispers: string[];
}

const Whisper: React.FC<WhisperProps> = ({ whispers }) => {
	return (
		<div
			style={{
				fontFamily: 'monospace',
				fontSize: '14px',
				lineHeight: '1.4',
				backgroundColor: '#1a1a1a', // Ensure background is visible
				color: '#00ff00', // Ensure text color is visible
				padding: '10px 20px',
				borderTop: '1px solid #00ff00',
				minHeight: '100px', // Give it a minimum height to always be visible
				overflowY: 'auto', // Add scroll if content overflows
				boxSizing: 'border-box', // Include padding in total width/height
			}}
		>
			{whispers.map((whisper, index) => (
				<p
					key={index}
					style={{ marginBottom: '5px', color: '#00ff00' }}
				>
					{whisper}
				</p>
			))}
			{whispers.length === 0 && (
				<p style={{ color: '#888', fontStyle: 'italic' }}>
					Oracle: Awaiting data...
				</p>
			)}
		</div>
	);
};

export default Whisper;
