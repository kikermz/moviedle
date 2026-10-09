import 'dotenv/config'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type Movie = {
  id: number
  title: string
}

type MovieDetails = {
  id: number
  cast: string[]
  director: string | null
}

const token = process.env.TMDB_ACCESS_TOKEN

if (!token) {
  throw new Error('Missing TMDB_ACCESS_TOKEN in server/.env')
}

async function fetchMovieDetails(movie: Movie): Promise<MovieDetails> {
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${movie.id}/credits`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(
      `Could not fetch credits for ${movie.title}: HTTP ${response.status}`,
    )
  }

  const data = (await response.json()) as {
    cast: { name: string; order: number }[]
    crew: { name: string; job: string }[]
  }

  return {
    id: movie.id,
    cast: data.cast
      .sort((a, b) => a.order - b.order)
      .slice(0, 5)
      .map((actor) => actor.name),
    director:
      data.crew.find((person) => person.job === 'Director')?.name ?? null,
  }
}

async function main() {
  const poolPath = join(process.cwd(), 'data', 'movie-pool.json')
  const detailsPath = join(process.cwd(), 'data', 'movie-details.json')

  const pool = JSON.parse(
    await readFile(poolPath, 'utf8'),
  ) as Movie[]

  const details: MovieDetails[] = []

  for (const [index, movie] of pool.entries()) {
    details.push(await fetchMovieDetails(movie))

    if ((index + 1) % 25 === 0 || index + 1 === pool.length) {
      console.log(`Fetched credits for ${index + 1}/${pool.length} movies`)
    }

    // Small delay between requests to reduce rate-limit risk.
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  await writeFile(detailsPath, JSON.stringify(details, null, 2), 'utf8')
  console.log(`Saved details for ${details.length} movies.`)
}

main().catch((error: unknown) => {
  console.error('Could not generate movie details:', error)
  process.exitCode = 1
})