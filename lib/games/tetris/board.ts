// Lógica pura del tablero, portada de game.js: el tablero y la pieza se pasan por parámetro.
import {
  COLS,
  DROP_STEP,
  INITIAL_DROP_INTERVAL,
  LINES_PER_LEVEL,
  MIN_DROP_INTERVAL,
  PIECE_TYPES,
  PIECES,
  ROWS,
  WALL_KICKS,
} from "./constants";
export type Board = number[][];
export type Shape = number[][];
export interface Piece {
  type: number;
  shape: Shape;
  x: number;
  y: number;
}
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}
export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_TYPES) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}
export function collide(board: Board, shape: Shape, ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}
// Rota la pieza con wall kicks; si ningún desplazamiento cabe, la rotación se descarta.
export function tryRotate(board: Board, piece: Piece): void {
  const rotated = rotateCW(piece.shape);
  for (const kick of WALL_KICKS) {
    if (!collide(board, rotated, piece.x + kick, piece.y)) {
      piece.shape = rotated;
      piece.x += kick;
      return;
    }
  }
}
export function merge(board: Board, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c]) board[piece.y + r][piece.x + c] = piece.shape[r][c];
}
// Elimina las filas completas (modifica el tablero) y devuelve cuántas fueron.
export function clearLines(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
export function levelForLines(lines: number): number {
  return Math.floor(lines / LINES_PER_LEVEL) + 1;
}
export function dropIntervalForLevel(level: number): number {
  return Math.max(MIN_DROP_INTERVAL, INITIAL_DROP_INTERVAL - (level - 1) * DROP_STEP);
}
