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

    // Expand some emoji variants (helps a bit)
    const expanded = [];
    for (const e of emojis) {
      if (e === "✊") expanded.push("✊", "✊🏻", "✊🏼", "✊🏽", "✊🏾", "✊🏿");
      else if (e === "⚧️") expanded.push("⚧️", "⚧");
      else expanded.push(e);
    }
    const uniqueEmojis = [...new Set(expanded)];
    const emojiOr = uniqueEmojis.length ? `(${uniqueEmojis.join(" OR ")})` : "";

    const profileScope = `(site:linkedin.com/in OR site:linkedin.com/pub OR site:br.linkedin.com/in)`;

    const quotedName = name ? `"${name.replaceAll('"', "")}"` : "";

    // Build 3 queries (most strict -> least strict)
    // Q1: strict: name phrase + intitle + emoji
    // Q2: relax: remove intitle (it can kill results)
    // Q3: relax more: remove emoji (CSE often fails on emoji indexing)
    const baseParts = [profileScope];

    // add non-name terms
    if (role) baseParts.push(role);
    if (extra) baseParts.push(extra);
    if (location) baseParts.push(`"${location.replaceAll('"', "")}"`);

    const q1Parts = [...baseParts];
    const q2Parts = [...baseParts];
    const q3Parts = [...baseParts];

    if (quotedName) {
      q1Parts.unshift(`intitle:${quotedName}`);
      q1Parts.unshift(quotedName);

      q2Parts.unshift(quotedName);

      q3Parts.unshift(quotedName);
    }

    if (emojiOr) q1Parts.push(emojiOr);
    if (emojiOr) q2Parts.push(emojiOr);
    // q3 deliberately no emojiOr

    const queries = [
      { label: "strict_name_intitle_plus_emoji", q: q1Parts.join(" ").trim() },
      { label: "name_plus_emoji",               q: q2Parts.join(" ").trim() },
      { label: "name_no_emoji_fallback",        q: q3Parts.join(" ").trim() },
    ];

    async function runGoogle(query) {
      const url = new URL("https://www.googleapis.com/customsearch/v1");
      url.searchParams.set("key", key);
      url.searchParams.set("cx", cx);
      url.searchParams.set("q", query);
      url.searchParams.set("num", "10");
      url.searchParams.set("safe", "off");

      const r = await fetch(url.toString());
      const data = await r.json();

      if (!r.ok) {
        return { ok: false, status: r.status, error: data?.error?.message || "Google API error" };
      }

      const items = (data.items || []).map(it => ({
        title: it.title || "",
        snippet: it.snippet || "",
        link: it.link || ""
      })).filter(x => x.link);

      return { ok: true, items };
    }

    // Try queries in order until we get results
    let used = null;
    let items = [];
    for (const candidate of queries) {
      const out = await runGoogle(candidate.q);
      if (!out.ok) {
        return res.status(502).json({ error: out.error, debugQuery: candidate.q });
      }
      if (out.items.length) {
        used = candidate;
        items = out.items;
        break;
      }
    }

    // If all empty, return empty but show the strict query for debugging
    if (!used) {
      used = queries[0];
      items = [];
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      items,
      debugQuery: used.q,
      strategyUsed: used.label,
      note:
        (strategyUsedMeaning(used.label, emojis.length) || null)
    });

    function strategyUsedMeaning(label, hadEmojis) {
      if (label === "strict_name_intitle_plus_emoji") return "Aplicou nome+intitle+emoji (mais estrito).";
      if (label === "name_plus_emoji") return "Aplicou nome+emoji (relaxou intitle).";
      if (label === "name_no_emoji_fallback") {
        return hadEmojis
          ? "⚠️ Não houve resultados com emoji (CSE costuma falhar com emojis). Mostrando fallback sem emoji."
          : "Mostrando fallback sem emoji.";
      }
      return null;
    }
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Search failed" });
  }
}
