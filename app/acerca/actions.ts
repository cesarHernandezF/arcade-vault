"use server";

import { Resend } from "resend";
import { validateContact, type ContactResult } from "@/lib/contact";

const GENERIC_ERROR =
  "NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO EN UNOS MINUTOS.";

export async function sendContactMessage(
  _prev: ContactResult,
  formData: FormData,
): Promise<ContactResult> {
  // 1. Honeypot: un bot rellenó el campo oculto. Responder éxito sin enviar.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return { status: "success", name: "" };
  }

  // 2. Validación en el servidor
  const parsed = validateContact({
    name: formData.get("name"),
    email: formData.get("email"),
    msg: formData.get("msg"),
  });
  if (!parsed.ok) {
    return { status: "error", message: GENERIC_ERROR };
  }
  const { name, email, msg } = parsed.value;

  // 3. Variables de entorno
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error(
      "[contact] Faltan variables de entorno: RESEND_API_KEY y/o CONTACT_TO_EMAIL",
    );
    return { status: "error", message: GENERIC_ERROR };
  }

  // 4. Envío
  const safeName = name.replace(/[\r\n]+/g, " ").trim();
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `Arcade Vault <${from}>`,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${safeName}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}\n`,
    });
    if (error) {
      console.error("[contact] Resend devolvió un error:", error);
      return { status: "error", message: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("[contact] Excepción al enviar con Resend:", err);
    return { status: "error", message: GENERIC_ERROR };
  }

  return { status: "success", name: safeName };
}
