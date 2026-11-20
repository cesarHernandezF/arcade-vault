import { CELL, FRUIT_MAX_SIZE, HUD_H } from "./constants";
export interface Sprite {
  x: number;
  y: number;
  w: number;
  h: number;
}
// Atlas portado de references/source-assets/snake-assets/snake-assets/sprites.js
// (fila central de fruits.png, 3790×442 px). Coordenadas y nombres sin cambios:
// los nombres son identificadores del recorte, no descripciones fiables del dibujo.
export const FRUITS: Record<string, Sprite> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};
export const FRUIT_NAMES: string[] = Object.keys(FRUITS);
// Carga la imagen. Devuelve una función que cancela la carga pendiente
// (el callback ya no se invoca). Solo se llama desde createEngine.
export function loadSpritesheet(
  src: string,
  onLoad: (img: HTMLImageElement) => void,
  onError: () => void,
): () => void {
  let cancelled = false;
  const img = new Image();
  img.onload = () => {
    if (!cancelled) onLoad(img);
  };
  img.onerror = () => {
    if (!cancelled) onError();
  };
  img.src = src;
  return () => {
    cancelled = true;
    img.onload = null;
    img.onerror = null;
  };
}
// Dibuja la fruta centrada en la celda, conservando la proporción (máx. 36 px).
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sprite: Sprite,
  col: number,
  row: number,
) {
  const scale = Math.min(FRUIT_MAX_SIZE / sprite.h, FRUIT_MAX_SIZE / sprite.w);
  const dw = sprite.w * scale;
  const dh = sprite.h * scale;
  const dx = col * CELL + (CELL - dw) / 2;
  const dy = HUD_H + row * CELL + (CELL - dh) / 2;
  ctx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, dx, dy, dw, dh);
}
