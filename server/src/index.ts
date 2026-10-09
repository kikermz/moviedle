import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import { createGame, submitGuess } from './game.js'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
const port = Number(process.env.PORT) || 3001
app.use(express.json())

type Movie = {
  id: number
  title: string
  release_date: string
  genre_ids: number[]
  poster_path: string | null
  popularity: number
}

app.get('/api/movies/search', async (req, res) => {
  const query = req.query.query

  if (typeof query !== 'string' || !query.trim()) {
    res.status(400).json({ error: 'Please provide a movie title.' })
    return
  }

  try {
    const poolPath = join(process.cwd(), 'data', 'movie-pool.json')
    const contents = await readFile(poolPath, 'utf8')
    const pool = JSON.parse(contents) as Movie[]

    const normalizedQuery = query.trim().toLowerCase()

    const matches = pool
      .filter((movie) =>
        movie.title.toLowerCase().includes(normalizedQuery)
      )
      .sort((a, b) => {
        const aExact = a.title.toLowerCase() === normalizedQuery
        const bExact = b.title.toLowerCase() === normalizedQuery

        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1

        return b.popularity - a.popularity
      })
      .slice(0, 5)

    res.json(matches)
  } catch (error) {
    console.error('Curated movie search failed:', error)
    res.status(500).json({ error: 'Could not search the movie pool.' })
  }
})

app.post('/api/game', async (_req, res) => {
  try {
    res.json(await createGame())
  } catch (error) {
    console.error('Could not create game:', error)
    res.status(500).json({ error: 'Could not create a game.' })
  }
})

app.post('/api/game/:gameId/guess', async (req, res) => {
  const movieId = Number(req.body?.movieId)

  if (!Number.isInteger(movieId) || movieId <= 0) {
    res.status(400).json({ error: 'A valid movie ID is required.' })
    return
  }

  try {
    const result = await submitGuess(req.params.gameId, movieId)

    if ('error' in result) {
      res.status(Number(result.status)).json({ error: result.error })
      return
    }

    res.json(result.result)
  } catch (error) {
    console.error('Could not submit guess:', error)
    res.status(500).json({ error: 'Could not submit guess.' })
  }
})

app.listen(port, () => {
  console.log(`Moviedle server running at http://localhost:${port}`)
})