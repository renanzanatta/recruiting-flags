// /api/search — Vercel Serverless Function
// Required env vars: GOOGLE_API_KEY, GOOGLE_CX
//
// Expects POST JSON: { q: string, emojis: string[] }
//
// Behavior:
// - Always searches LinkedIn profiles: site:linkedin.com/in
// - If emojis array has 1+ items, adds: (emoji1 OR emoji2 OR ...)

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const body = req.body || {};
    const q = (body.q || "").toString().trim();
    const emojis = Array.isArray(body.emojis) ? body.emojis.map(String).filter(Boolean) : [];

    if (!q) return res.status(400).json({ error: "Missing q" });

    const key = process.env.GOOGLE_API_KEY;
    const cx  = process.env.GOOGLE_CX;

    if (!key || !cx) {
      return res.status(500).json({
        error: "Missing GOOGLE_API_KEY or GOOGLE_CX in Vercel Environment Variables (Production). Redeploy after adding them."
      });
    }

    // Expand a few emoji variants to improve matching
    const expanded = [];
    for (const e of emojis) {
      if (e === "✊") {
        expanded.push("✊", "✊🏻", "✊🏼", "✊🏽", "✊🏾", "✊🏿");
      } else if (e === "⚧️") {
        expanded.push("⚧️", "⚧"); // some renderers drop VS16
      } else {
        expanded.push(e);
      }
    }
    const uniqueEmojis = [...new Set(expanded)];

    const emojiOr = uniqueEmojis.length
      ? `(${uniqueEmojis.join(" OR ")})`
      : "";

    const query = `site:linkedin.com/in ${q} ${emojiOr}`.trim();

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", key);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "10");

    const r = await fetch(url.toString());
    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || "Google API error" });
    }

    const items = (data.items || []).map(it => ({
      title: it.title || "",
      snippet: it.snippet || "",
      link: it.link || ""
    })).filter(x => x.link);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Search failed" });
  }
}
