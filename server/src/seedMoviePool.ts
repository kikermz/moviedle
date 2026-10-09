
import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type Movie = {
  id: number
  title: string
  original_title: string
  release_date: string
  genre_ids: number[]
  overview: string
  popularity: number
  vote_average: number
  vote_count: number
  poster_path: string | null
}

const genres = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
]

const eras = [
  { name: 'classics', lte: '1979-12-31' },
  { name: 'eighties_nineties', gte: '1980-01-01', lte: '1999-12-31' },
  { name: 'two_thousands', gte: '2000-01-01', lte: '2014-12-31' },
  { name: 'modern', gte: '2015-01-01' },
]

const token = process.env.TMDB_ACCESS_TOKEN

if (!token) {
  throw new Error('Missing TMDB_ACCESS_TOKEN in server/.env')
}

async function fetchMovies(
  genreId: number,
  era: (typeof eras)[number],
  page: number,
): Promise<Movie[]> {
  const params = new URLSearchParams({
    language: 'en-US',
    include_adult: 'false',
    sort_by: 'popularity.desc',
    'vote_count.gte': '300',
    'vote_average.gte': '6.0',
    with_genres: String(genreId),
    page: String(page),
  })

  if (era.gte) params.set('release_date.gte', era.gte)
  if (era.lte) params.set('release_date.lte', era.lte)

  const response = await fetch(
    `https://api.themoviedb.org/3/discover/movie?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`TMDB returned HTTP ${response.status}`)
  }

  const data = (await response.json()) as { results: Movie[] }
  return data.results
}

async function main() {
  // Each genre/era gets its own bucket so one category
  // cannot dominate the final selection.
  const buckets: Movie[][] = []

  for (const genre of genres) {
    for (const era of eras) {
      const bucket: Movie[] = []

      for (const page of [1, 2, 3]) {
        const results = await fetchMovies(genre.id, era, page)
        bucket.push(...results)

        // Be polite to the API and reduce rate-limit risk.
        await new Promise((resolve) => setTimeout(resolve, 120))
      }

      buckets.push(bucket)
      console.log(`Fetched ${genre.name} / ${era.name}`)
    }
  }

  // Take turns selecting movies from different buckets.
  // A movie appearing in several genres is only included once.
  const selected = new Map<number, Movie>()
  let index = 0

  while (selected.size < 500) {
    let addedThisRound = false

    for (const bucket of buckets) {
      const movie = bucket[index]

      if (movie && !selected.has(movie.id)) {
        selected.set(movie.id, movie)
        addedThisRound = true

        if (selected.size === 500) break
      }
    }

    if (!addedThisRound) break
    index++
  }

  if (selected.size < 500) {
    throw new Error(
      `Only found ${selected.size} unique movies. ` +
      'We need to expand the search before saving the pool.',
    )
  }

  const pool = Array.from(selected.values())

  const outputDir = join(process.cwd(), 'data')
  await mkdir(outputDir, { recursive: true })

  await writeFile(
    join(outputDir, 'movie-pool.json'),
    JSON.stringify(pool, null, 2),
    'utf8',
  )

  console.log(`Successfully saved ${pool.length} movies.`)
}

main().catch((error: unknown) => {
  console.error('Could not generate movie pool:', error)
  process.exitCode = 1
})