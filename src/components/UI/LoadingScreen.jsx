import React from 'react';

export default function LoadingScreen() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#00d4ff" wireframe />
        </mesh>
    );
}
