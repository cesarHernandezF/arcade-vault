"use client";
import { useEffect, useRef } from "react";
import type { GameEngine, GameEvents } from "@/lib/game-engine";
import { GAME_ENGINES } from "@/lib/games/registry";
interface GameCanvasProps {
  id: string;
  events: GameEvents;
  onEngine?: (engine: GameEngine | null) => void;
}
export default function GameCanvas({ id, events, onEngine }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Los callbacks viven en una ref: el motor siempre llama a los más recientes
  // sin recrearse en cada render.
  const eventsRef = useRef(events);
  const onEngineRef = useRef(onEngine);
  useEffect(() => {
    eventsRef.current = events;
    onEngineRef.current = onEngine;
  });
  // El motor se recrea solo cuando cambia el id del juego.
  useEffect(() => {
    const canvas = canvasRef.current;
    const load = GAME_ENGINES[id];
    if (!canvas || !load) return;
    let cancelled = false;
    let engine: GameEngine | null = null;
    load().then(({ createEngine }) => {
      if (cancelled) return;
      engine = createEngine(canvas, {
        onScore: (s) => eventsRef.current.onScore(s),
        onLives: (l) => eventsRef.current.onLives(l),
        onLevel: (l) => eventsRef.current.onLevel(l),
        onGameOver: (s) => eventsRef.current.onGameOver(s),
        onRestart: () => eventsRef.current.onRestart(),
      });
      onEngineRef.current?.(engine);
    });
    return () => {
      cancelled = true;
      engine?.destroy();
      onEngineRef.current?.(null);
    };
  }, [id]);
  return <canvas ref={canvasRef} className="game-canvas" width={800} height={600} />;
}
