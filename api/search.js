module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).send("Method Not Allowed. Use POST.");
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};

    const role = (body.role || "").toString().trim();
    const location = (body.location || "").toString().trim();
    const name = (body.name || "").toString().trim();
    const extra = (body.extra || "").toString().trim();

    const key = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;

    if (!key || !cx) {
      return res.status(500).json({ error: "Missing GOOGLE_API_KEY or GOOGLE_CX" });
    }

    const profileScope = `(site:linkedin.com/in OR site:linkedin.com/pub OR site:br.linkedin.com/in)`;
    const parts = [profileScope];

    if (name) parts.push(`"${name.replace(/"/g, "")}"`);
    if (role) parts.push(role);
    if (extra) parts.push(extra);
    if (location) parts.push(`"${location.replace(/"/g, "")}"`);

    const query = parts.join(" ").trim();

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", key);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "10");
    url.searchParams.set("safe", "off");

    const r = await fetch(url.toString());
    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: data?.error?.message || "Google API error",
        debugQuery: query,
        received: { role, location, name, extra }
      });
    }

    const items = (data.items || [])
      .map((it) => ({ title: it.title || "", snippet: it.snippet || "", link: it.link || "" }))
      .filter((x) => x.link);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      items,
      debugQuery: query,
      received: { role, location, name, extra }
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Search failed" });
  }
};
