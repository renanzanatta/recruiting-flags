export default async function handler(req, res) {
  try {
    const q = (req.query.q || "").toString().trim();
    const onlyFlags = (req.query.onlyFlags || "0").toString() === "1";

    if (!q) return res.status(400).json({ error: "Missing q" });

    const key = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;

    if (!key || !cx) {
      return res.status(500).json({ error: "Missing GOOGLE_API_KEY or GOOGLE_CX" });
    }

    const emojiOr = `(🏳️‍🌈 OR 🏳️‍⚧️ OR ⚧️ OR ✊ OR 🖤 OR 🤎)`;
    const query = onlyFlags
      ? `site:linkedin.com/in ${q} ${emojiOr}`
      : `site:linkedin.com/in ${q}`;

    const url =
      `https://www.googleapis.com/customsearch/v1` +
      `?key=${encodeURIComponent(key)}` +
      `&cx=${encodeURIComponent(cx)}` +
      `&q=${encodeURIComponent(query)}` +
      `&num=10`;

    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || "Google API error" });
    }

    const items = (data.items || []).map(it => ({
      title: it.title || "",
      snippet: it.snippet || "",
      link: it.link || ""
    })).filter(x => x.link);

    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Search failed" });
  }
}
