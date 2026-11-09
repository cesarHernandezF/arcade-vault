import type { ScoreRow } from "@/lib/scores";
export default function Leaderboard({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--ink-faint)" }}>
          <div
            className="pixel"
            style={{ fontSize: 12, lineHeight: 1.8, color: "var(--magenta)", marginBottom: 12 }}
          >
            SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA
          </div>
          <div>Juega una partida y guarda tu puntuación.</div>
        </div>
      )}
      {rows.map((r, i) => (
        <div
          key={r.rank}
          className={"lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
        >
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">
            {r.name}
            <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
              {r.date}
            </div>
          </div>
          <div className="sc">{r.score.toLocaleString("es-ES")}</div>
        </div>
      ))}
    </div>
  );
}
