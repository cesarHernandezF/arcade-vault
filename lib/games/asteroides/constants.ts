// Constantes copiadas de references/started-games/02-asteroids/game.js sin cambiar valores.
export const W = 800;
export const H = 600;
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const TRIPLE_SPREAD = 0.18;
// Por tamaño de asteroide: índices 1, 2 y 3 (el 0 no se usa)
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
export const POINTS = [0, 100, 50, 20]; // puntos por tamaño
export const INITIAL_LIVES = 3;
export const INITIAL_ASTEROIDS = 4; // nivel 1; en los siguientes: 3 + nivel
