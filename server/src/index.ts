import express from 'express'
import 'dotenv/config'

const app = express()
const port = Number(process.env.PORT) || 3001

app.get('/api/movies/search', async (req, res) => {
  const query = req.query.query

  if (typeof query !== 'string' || !query.trim()) {
    res.status(400).json({ error: 'Please provide a movie title.' })
    return
  }

  const token = process.env.TMDB_ACCESS_TOKEN

  if (!token) {
    res.status(500).json({ error: 'TMDB credentials are not configured.' })
    return
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query.trim())}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    )

    if (!response.ok) {
  const details = await response.text()
  console.error('TMDB error:', response.status, details)

  res.status(response.status).json({
    error: 'TMDB request failed.',
    status: response.status,
  })
  return
}

    const data = await response.json()
    res.json(data.results)
  } catch {
    res.status(502).json({ error: 'Could not contact TMDB.' })
  }
})

app.listen(port, () => {
  console.log(`Moviedle server running at http://localhost:${port}`)
})