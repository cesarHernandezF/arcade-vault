"use client";

import { useActionState, useState, type FormEvent } from "react";
import { sendContactMessage } from "@/app/acerca/actions";
import type { ContactResult } from "@/lib/contact";

const INITIAL: ContactResult = { status: "idle" };
const EMPTY = { name: "", email: "", msg: "" };

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessage, INITIAL);
  const [form, setForm] = useState(EMPTY);
  const [shake, setShake] = useState(false);
  // Resultado de éxito ya descartado con "ENVIAR OTRO MENSAJE"
  const [dismissed, setDismissed] = useState<ContactResult | null>(null);

  const sent = state.status === "success" && state !== dismissed;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      // Evita que React invoque el Server Action
      e.preventDefault();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const reset = () => {
    setDismissed(state);
    setForm(EMPTY);
  };

  const thanksName = (state.status === "success" && state.name) || form.name.trim();

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      onSubmit={onSubmit}
    >
      {!sent ? (
        <>
          {state.status === "error" && (
            <div className="terminal-error" role="alert">
              <div className="term-bar">
                <span className="dot r"></span>
                <span className="dot y"></span>
                <span className="dot g"></span>
                <span className="term-title">VAULT-OS // TERMINAL</span>
              </div>
              <div className="term-body">
                <div className="line success">
                  &gt; ERROR: {state.message}
                  <span className="caret">_</span>
                </div>
              </div>
            </div>
          )}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="cf-website">WEBSITE</label>
            <input
              id="cf-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>
          <div className="field">
            <label htmlFor="cf-name">NOMBRE</label>
            <input
              id="cf-name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="cf-email">CORREO ELECTRÓNICO</label>
            <input
              id="cf-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="cf-msg">MENSAJE</label>
            <textarea
              id="cf-msg"
              name="msg"
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={pending}
          >
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {thanksName.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={reset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
