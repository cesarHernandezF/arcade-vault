import type { BlockColor } from "./levels";
export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
const explosionRow = (sy: number): Frame[] =>
  [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));
// gray reutiliza los frames de red, como el original.
export const EXPLOSION_FRAMES: Record<BlockColor, Frame[]> = {
  red: explosionRow(176),
  cyan: explosionRow(192),
  green: explosionRow(208),
  magenta: explosionRow(224),
  yellow: explosionRow(240),
  hotpink: explosionRow(256),
  gray: explosionRow(176),
};
export const SPRITES = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 } as Frame,
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 } as Frame,
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  } as Record<BlockColor, Frame>,
};
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
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.drawImage(img, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sprite: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  drawFrame(ctx, img, sprite, x, y, w, h);
}
