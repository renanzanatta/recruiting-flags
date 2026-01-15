// Vercel Serverless Function (Node runtime)
// Route: /api/search?q=...
// Uses Google Custom Search JSON API and returns normalized results.
//
// Required env vars:
// - GOOGLE_API_KEY
// - GOOGLE_CX
//
// Tip: configure your Programmable Search Engine to only search LinkedIn,
// or keep the site restrictions below.

export default async function handler(req, res) {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) {
      res.status(400).json({ error: "Missing q" });
      return;
    }

    const key = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;

    if (!key || !cx) {
      res.status(500).json({ error: "Server not configured (missing GOOGLE_API_KEY / GOOGLE_CX)" });
      return;
    }

    // Restrict to LinkedIn profile pages
    // You can tweak this to include /pub etc.
    const query = `site:linkedin.com/in ${q}`;

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", key);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "10");

    const r = await fetch(url.toString());
    const data = await r.json();

    if (!r.ok) {
      res.status(r.status).json({
        error: data && data.error && data.error.message ? data.error.message : "Google API error",
      });
      return;
    }

    const items = (data.items || []).map((it) => ({
      title: it.title || "",
      snippet: it.snippet || "",
      link: it.link || "",
      displayLink: it.displayLink || "",
    })).filter(x => x.link);

    // Basic CORS (useful if you later host frontend elsewhere)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : "Search failed" });
  }
}
