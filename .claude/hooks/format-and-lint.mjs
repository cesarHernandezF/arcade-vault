// PostToolUse hook (Write|Edit|MultiEdit): pasa el archivo por Prettier y ESLint.
// Solo aplica al proyecto Arcade Vault (vive en .claude/ del repo).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const LINTABLE = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const COMPACTABLE = new Set([...LINTABLE, ".css"]);
const SKIP_DIRS = ["node_modules", ".next", "out", "build", "references", ".claude"];

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const file = input?.tool_response?.filePath ?? input?.tool_input?.file_path;
if (!file) process.exit(0);

const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const abs = path.resolve(file);
const rel = path.relative(projectDir, abs);

// Fuera del proyecto, inexistente o en carpetas ignoradas: no hacer nada.
if (rel.startsWith("..") || path.isAbsolute(rel) || !existsSync(abs)) process.exit(0);
if (rel.split(path.sep).some((part) => SKIP_DIRS.includes(part))) process.exit(0);

// Se invocan los binarios con node directamente: sin shell y sin el costo de npx.
const bin = (pkg, script) => path.join(projectDir, "node_modules", pkg, script);
const run = (script, args) =>
  spawnSync(process.execPath, [script, ...args], { cwd: projectDir, encoding: "utf8" });

const errors = [];

// Compacta el código: quita espacios finales y todas las líneas en blanco.
if (COMPACTABLE.has(path.extname(abs).toLowerCase())) {
  const source = readFileSync(abs, "utf8");
  const compact = source
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/, ""))
    .filter((line) => line !== "")
    .join("\n");
  const next = compact === "" ? "" : `${compact}\n`;
  if (next !== source) writeFileSync(abs, next);
}

const prettier = run(bin("prettier", "bin/prettier.cjs"), ["--write", "--ignore-unknown", abs]);
if (prettier.status !== 0) {
  errors.push(`Prettier falló en ${rel}:\n${prettier.stderr || prettier.stdout}`);
}

if (LINTABLE.has(path.extname(abs).toLowerCase())) {
  const eslint = run(bin("eslint", "bin/eslint.js"), ["--fix", abs]);
  if (eslint.status !== 0) {
    errors.push(`ESLint encontró errores en ${rel}:\n${eslint.stdout}${eslint.stderr}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n\n"));
  process.exit(2); // Claude Code le muestra stderr a Claude para que lo corrija.
}
