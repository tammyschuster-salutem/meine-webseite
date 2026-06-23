// Cloudflare Pages Function – erreichbar unter  POST /api/lead
// Nimmt einen Lead (Vorname + E-Mail) als JSON entgegen, validiert ihn,
// leitet ihn optional an einen Webhook weiter (LEAD_WEBHOOK_URL) und
// bestätigt den Erfolg.

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1) JSON-Body einlesen
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Ungültiges JSON." }, 400);
  }

  // Das Frontend sendet { firstName, email } – "name" als Fallback erlauben
  const firstName = String(data.firstName || data.name || "").trim();
  const email = String(data.email || "").trim();

  // 2) Validierung
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!firstName || !emailOk) {
    return json(
      { ok: false, error: "Bitte einen Vornamen und eine gültige E-Mail angeben." },
      422
    );
  }

  // 3) Lead zusammenstellen
  const lead = {
    firstName,
    email,
    receivedAt: new Date().toISOString(),
    source: "pixel-pfoten",
  };

  // 4) Optional an externen Webhook weiterleiten (z. B. webhook.site)
  if (env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      // Weiterleitung fehlgeschlagen – Lead trotzdem bestätigen,
      // damit der Nutzer nicht blockiert wird.
      console.error("Webhook-Weiterleitung fehlgeschlagen:", err);
    }
  }

  // 5) Erfolg zurückgeben
  return json({ ok: true, message: "Willkommen im Clowder! 🐾" });
}

// Hilfsfunktion: JSON-Antwort mit korrektem Header
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
