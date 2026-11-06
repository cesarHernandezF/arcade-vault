import type { Accent } from "@/lib/games";

export type { Accent };
export type HighlightIconKind = "HEART" | "BROWSER" | "PLANT";

export interface Highlight {
  icon: HighlightIconKind;
  text: string;
  color: Accent;
}

export const HIGHLIGHTS: Highlight[] = [
  { icon: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  { icon: "BROWSER", text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", color: "cyan" },
  { icon: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

export const CONTACT_TIPS: { text: string; led: "" | "y" | "m" }[] = [
  { text: "RESPUESTA EN 24-48H", led: "" },
  { text: "SUGERENCIAS BIENVENIDAS", led: "y" },
  { text: "SIN SPAM, JAMÁS", led: "m" },
];
