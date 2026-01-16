export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed. Use POST." });
    }

    const body = req.body || {};

    const role = (body.role || "").toString().trim();
    const location = (body.location || "").toString().trim();
    const name = (body.name || "").toString().trim();
    const extra = (body.extra || "").toString().trim();
    const emojis = Array.isArray(body.emojis) ? body.emojis.map(String).filter(Boolean) : [];

    if (!(role || location || name || extra)) {
      return res.status(400).json({ error: "Missing query. Provide role/location/name/extra." });
    }

    const key = process.env.GOOGLE_API_KEY;
    const cx  = process.env.GOOGLE_CX;

    if (!key || !cx) {
      return res.status(500).json({
        error: "Missing GOOGLE_API_KEY or GOOGLE_CX in Vercel Environment Variables (Production). Redeploy after adding them."
      });
    }

    // Expand some variants
    const expanded = [];
    for (const e of emojis) {
      if (e === "✊") expanded.push("✊", "✊🏻", "✊🏼", "✊🏽", "✊🏾", "✊🏿");
      else if (e === "⚧️") expanded.push("⚧️", "⚧");
      else expanded.push(e);
    }
    const uniqueEmojis = [...new Set(expanded)];
    const emojiOr = uniqueEmojis.length ? `(${uniqueEmojis.join(" OR ")})` : "";

    // Profile scope: in + pub + br
    const profileScope = `(site:linkedin.com/in OR site:linkedin.com/pub OR site:br.linkedin.com/in)`;

    // Build query parts
    const parts = [profileScope];

    // Name: enforce exact phrase + intitle (precision)
    if (name) {
      const quotedName = `"${name.replaceAll('"', '')}"`;
      parts.push(quotedName);
      parts.push(`intitle:${quotedName}`);
    }

    // Role / extra / location: less strict
    if (role) parts.push(role);
    if (extra) parts.push(extra);
    if (location) parts.push(`"${location.replaceAll('"', '')}"`);

    if (emojiOr) parts.push(emojiOr);

    const query = parts.join(" ").trim();

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", key);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "10");

    // Make it closer to your Google experience
    url.searchParams.set("hl", "pt");
    url.searchParams.set("gl", "br");
    url.searchParams.set("safe", "off");

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
    return res.status(200).json({ items, debugQuery: query });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Search failed" });
  }
}
