"use client";

import { useRef, useEffect, useState } from 'react';
import SimulationEngine from '@/core/engine';

export default function CanvasSimulation({ 
    initSimulation, 
    updateSimulation, 
    drawSimulation, 
    onResize 
}) {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const [engineReady, setEngineReady] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        
        // Handle Resize
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (onResize) onResize(canvas.width, canvas.height);
        };
        
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial sizing

        // Initialize Engine
        const engine = new SimulationEngine(ctx, { backgroundColor: 'rgb(20,20,20)' });
        engineRef.current = engine;
        
        if (initSimulation) {
            initSimulation(engine, canvas.width, canvas.height);
        }

        // Start Loop
        engine.start(
            (dt) => updateSimulation && updateSimulation(dt, engine),
            (context) => drawSimulation && drawSimulation(context, engine, canvas.width, canvas.height)
        );

        setEngineReady(true);

        return () => {
            window.removeEventListener('resize', handleResize);
            engine.stop();
        };
    }, []);

    // We can expose the engine via a context or let the parent manage it, but usually letting the parent pass callbacks is cleaner.
    return (
        <canvas 
            ref={canvasRef} 
            className="block w-full h-full bg-black touch-none"
            style={{ width: '100vw', height: '100vh' }}
        />
    );
}
