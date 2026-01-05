import React from 'react';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export default function PostProcessing() {
    return (
        <EffectComposer>
            {/* Bloom for glowing effects */}
            <Bloom
                intensity={0.5}
                luminanceThreshold={0.2}
                luminanceSmoothing={0.9}
                blendFunction={BlendFunction.ADD}
            />

            {/* Subtle chromatic aberration for premium feel */}
            <ChromaticAberration
                offset={[0.0005, 0.0005]}
                blendFunction={BlendFunction.NORMAL}
            />

            {/* Vignette for focus effect */}
            <Vignette
                offset={0.3}
                darkness={0.5}
                blendFunction={BlendFunction.NORMAL}
            />
        </EffectComposer>
    );
}
