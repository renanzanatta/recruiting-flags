export default async function handler(req, res) {
  const q = req.query.q;
  const url =
    `https://www.googleapis.com/customsearch/v1` +
    `?key=${process.env.GOOGLE_API_KEY}` +
    `&cx=${process.env.GOOGLE_CX}` +
    `&q=${encodeURIComponent(q)}`;

  const r = await fetch(url);
  const data = await r.json();
  res.status(200).json(data);
}
