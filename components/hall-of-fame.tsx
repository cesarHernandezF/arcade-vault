"use client";
import { useState } from "react";
import Link from "next/link";
import type { ScoreRow } from "@/lib/scores";
export interface HallEntry {
  id: string;
  title: string;
  rows: ScoreRow[];
}
export default function HallOfFame({ entries }: { entries: HallEntry[] }) {
  const [tab, setTab] = useState(entries[0]?.id);
  const rows = (entries.find((e) => e.id === tab) ?? entries[0])?.rows ?? [];
  // La columna JUEGO solo aparece cuando las filas traen el título del juego (GLOBAL).
  const showGame = rows.some((r) => r.game !== undefined);
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs">
        {entries.map((e) => (
          <button
            key={e.id}
            className={"chip" + (tab === e.id ? " active" : "")}
            onClick={() => setTab(e.id)}
          >
            {e.title}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 16px", color: "var(--ink-faint)" }}>
          <div
            className="pixel"
            style={{ fontSize: 14, lineHeight: 1.8, color: "var(--magenta)", marginBottom: 12 }}
          >
            SÉ EL PRIMERO EN ENTRAR AL SALÓN DE LA FAMA
          </div>
          <div>Juega una partida y guarda tu puntuación.</div>
        </div>
      ) : (
        <>
          <div className="podium">
            {rows[1] && (
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{rows[1].name}</div>
                <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
                <div className="date">{rows[1].date}</div>
              </div>
            )}
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{rows[0].name}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {rows[0].score.toLocaleString("es-ES")}
              </div>
              <div className="date">{rows[0].date}</div>
            </div>
            {rows[2] && (
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{rows[2].name}</div>
                <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
                <div className="date">{rows[2].date}</div>
              </div>
            )}
          </div>
          <div className={"hall-table" + (showGame ? " with-game" : "")}>
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              {showGame && <div className="gm">JUEGO</div>}
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                {showGame && <div className="gm">{r.game}</div>}
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
