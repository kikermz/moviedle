import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

type Movie = {
  id: number
  title: string
  release_date: string
  genre_ids: number[]
  poster_path: string | null
  vote_average: number
  overview: string
}

type MovieDetails = {
  id: number
  cast: string[]
  director: string | null
}

type Game = {
  answer: Movie
  guesses: number[]
  finished: boolean
}

const poolPath = join(process.cwd(), 'data', 'movie-pool.json')
const detailsPath = join(process.cwd(), 'data', 'movie-details.json')

const games = new Map<string, Game>()

async function loadMoviePool(): Promise<Movie[]> {
  const contents = await readFile(poolPath, 'utf8')
  return JSON.parse(contents) as Movie[]
}

async function loadMovieDetails(): Promise<MovieDetails[]> {
  const contents = await readFile(detailsPath, 'utf8')
  return JSON.parse(contents) as MovieDetails[]
}


function getClues(
  guessedMovie: Movie,
  answer: Movie,
  guessedDetails: MovieDetails | undefined,
  answerDetails: MovieDetails | undefined,
) {
  const guessedYear = Number(guessedMovie.release_date.slice(0, 4))
  const answerYear = Number(answer.release_date.slice(0, 4))

  const yearDifference = Math.abs(guessedYear - answerYear)

  const commonGenres = guessedMovie.genre_ids.filter((genre) =>
    answer.genre_ids.includes(genre),
  )

  const commonCast = (guessedDetails?.cast ?? []).filter((actor) =>
    (answerDetails?.cast ?? []).includes(actor),
  )

  const ratingDifference = Math.abs(
    guessedMovie.vote_average - answer.vote_average,
  )

  return {
    year: {
      guessed: guessedYear,
      answer: answerYear,
      match: yearDifference === 0 ? 'exact' : yearDifference <= 5 ? 'close' : 'far',
      direction:
        guessedYear === answerYear
          ? 'same'
          : guessedYear < answerYear
            ? 'up'
            : 'down',
    },
    genre: {
      common: commonGenres.length,
      total: answer.genre_ids.length,
      match:
        commonGenres.length === answer.genre_ids.length &&
        commonGenres.length === guessedMovie.genre_ids.length
          ? 'exact'
          : commonGenres.length > 0
            ? 'partial'
            : 'none',
    },
    cast: {
      common: commonCast,
      match:
        commonCast.length >= 3
          ? 'exact'
          : commonCast.length > 0
            ? 'partial'
            : 'none',
    },
    rating: {
      guessed: guessedMovie.vote_average,
      answer: answer.vote_average,
      match:
        ratingDifference < 0.1
          ? 'exact'
          : ratingDifference <= 1
            ? 'close'
            : 'far',
      direction:
        guessedMovie.vote_average === answer.vote_average
          ? 'same'
          : guessedMovie.vote_average < answer.vote_average
            ? 'up'
            : 'down',
    },
  }
}

export async function createGame() {
  const pool = await loadMoviePool()
  const answer = pool[Math.floor(Math.random() * pool.length)]

  if (!answer) {
    throw new Error('The movie pool is empty.')
  }

  const gameId = randomUUID()

  games.set(gameId, {
    answer,
    guesses: [],
    finished: false,
  })

  return { gameId, maxGuesses: 6 }
}

export async function submitGuess(gameId: string, movieId: number) {
  const game = games.get(gameId)

  if (!game) {
    return { error: 'Game not found.', status: 404 as const }
  }

  if (game.finished) {
    return { error: 'This game has ended.', status: 400 as const }
  }

  if (game.guesses.length >= 6) {
    return { error: 'No guesses remaining.', status: 400 as const }
  }

  if (game.guesses.includes(movieId)) {
    return { error: 'You already guessed that movie.', status: 400 as const }
  }

 
const pool = await loadMoviePool()
const guessedMovie = pool.find((movie) => movie.id === movieId)

if (!guessedMovie) {
  return { error: 'Movie not found in the game pool.', status: 404 as const }
}

const details = await loadMovieDetails()

const answerDetails = details.find(
  (movie) => movie.id === game.answer.id,
)

const guessedDetails = details.find(
  (movie) => movie.id === movieId,
)

  game.guesses.push(movieId)

  const won = guessedMovie.id === game.answer.id
  const lost = !won && game.guesses.length >= 6

  if (won || lost) {
    game.finished = true
  }

  return {
    result: {
      guessesUsed: game.guesses.length,
      remainingGuesses: 6 - game.guesses.length,
      won,
      lost,
      
      feedback: {
  title: guessedMovie.title,
  releaseYear: guessedMovie.release_date?.slice(0, 4) || 'Unknown',
  genres: guessedMovie.genre_ids,
  answerTitle: game.finished ? game.answer.title : undefined,
  clues: getClues(
    guessedMovie,
    game.answer,
    guessedDetails,
    answerDetails,
  ),
  hint:
    game.guesses.length >= 4
      ? answerDetails?.director ?? 'Director information unavailable'
      : game.guesses.length >= 2
        ? answerDetails?.cast[0] ?? 'Cast information unavailable'
        : undefined,
},
    },
  }
}