
import { useEffect, useState } from 'react'
import './App.css'

type Movie = {
  id: number
  title: string
  release_date: string
  poster_path: string | null
}


type GuessResult = {
  guessesUsed: number
  remainingGuesses: number
  won: boolean
  lost: boolean
  feedback: {
    title: string
    releaseYear: string
    genres: number[]
    answerTitle?: string
    clues: {
      year: {
        guessed: number
        answer: number
        match: 'exact' | 'close' | 'far'
        direction: 'same' | 'up' | 'down'
      }
      genre: {
        common: number
        total: number
        match: 'exact' | 'partial' | 'none'
      }
      cast: {
        common: string[]
        match: 'exact' | 'partial' | 'none'
      }
      rating: {
        guessed: number
        answer: number
        match: 'exact' | 'close' | 'far'
        direction: 'same' | 'up' | 'down'
      }
    }
    hint?: string
  }
}

type PreviousGuess = {
  title: string
  result: GuessResult
}

function App() {
  const [guess, setGuess] = useState('')
  const [gameId, setGameId] = useState('')
  const [remainingGuesses, setRemainingGuesses] = useState(6)
  const [previousGuesses, setPreviousGuesses] = useState<PreviousGuess[]>([])

  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [answerTitle, setAnswerTitle] = useState('')

  useEffect(() => {
    async function startGame() {
      try {
        const response = await fetch('http://localhost:3001/api/game', {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Could not start a game.')
        }

        const game = await response.json()
        setGameId(game.gameId)
      } catch {
        setError('Could not start a game. Is the backend running?')
      }
    }

    startGame()
  }, [])

  async function searchMovies(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = guess.trim()
    if (!title) return

    setIsSearching(true)
    setError('')
    setSearchResults([])

    try {
      const response = await fetch(
        `http://localhost:3001/api/movies/search?query=${encodeURIComponent(title)}`
      )

      if (!response.ok) {
        throw new Error('Movie search failed.')
      }

      const movies: Movie[] = await response.json()
      movies.sort((a, b) =>
     a.title.localeCompare(b.title, undefined, {
    sensitivity: 'base',
  })
)
      setSearchResults(movies.slice(0, 5))

      if (movies.length === 0) {
        setError('No movies found. Try another title.')
      }
    } catch {
      setError('Could not search movies. Check that the backend is running.')
    } finally {
      setIsSearching(false)
    }
  }

  async function submitGuess(movie: Movie) {
    if (!gameId || isSubmitting || gameOver) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(
        `http://localhost:3001/api/game/${gameId}/guess`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movieId: movie.id }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not submit guess.')
      }

      const result = data as GuessResult

      setPreviousGuesses((previous) => [
        ...previous,
        { title: movie.title, result },
      ])
      setRemainingGuesses(result.remainingGuesses)
      setSearchResults([])
      setGuess('')

      if (result.won || result.lost) {
        setGameOver(true)
        setAnswerTitle(result.feedback.answerTitle || '')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not submit guess.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function restartGame() {
    setError('')
    setGameOver(false)
    setAnswerTitle('')
    setPreviousGuesses([])
    setRemainingGuesses(6)
    setGuess('')
    setSearchResults([])

    try {
      const response = await fetch('http://localhost:3001/api/game', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Could not start a new game.')
      }

      const game = await response.json()
      setGameId(game.gameId)
    } catch {
      setError('Could not start a new game. Is the backend running?')
    }
  }

  return (
    <main className="game">
      <header className="header">
        <h1>🎬 MOVIEDLE</h1>
        <button onClick={restartGame} disabled={isSubmitting}>
        Create New Game
        </button>
        <p>Guess the movie. Match the clues.</p>
      </header>

      <section className="game-panel">
        <div className="status">
          <span>DAILY CHALLENGE</span>
          <span>{6 - remainingGuesses} / 6 guesses</span>
        </div>

        <h2>Guess the mystery movie</h2>
        <p className="hint">
          Search for a movie, then select it to submit your guess.
        </p>

        <form className="guess-form" onSubmit={searchMovies}>
          <input
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            placeholder="e.g. Interstellar"
            aria-label="Movie title"
            disabled={!gameId || gameOver || isSubmitting}
          />
          <button
            type="submit"
            disabled={!gameId || gameOver || isSearching || isSubmitting}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {!gameId && !error && <p>Starting a new game...</p>}
        {error && <p role="alert">{error}</p>}

        {searchResults.length > 0 && (
          <div className="search-results">
            <p>Select the movie you want to guess:</p>
            
          {searchResults.map((movie) => (
            <button
              key={movie.id}
              type="button"
              onClick={() => submitGuess(movie)}
              disabled={isSubmitting || gameOver}
              className="movie-option"
            >
              {movie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                  alt=""
                  className="movie-option-poster"
                />
              ) : (
                <div className="movie-option-poster poster-placeholder">
                  No poster
                </div>
              )}

              <span>
                {movie.title} (
                {movie.release_date
                  ? movie.release_date.slice(0, 4)
                  : 'Year unknown'}
                )
              </span>
            </button>
          ))}
          </div>
        )}

        {isSubmitting && <p>Checking your guess...</p>}

        {gameOver && (
          <div>
            <h3>{previousGuesses.at(-1)?.result.won ? '🎉 You won!' : 'Game over!'}</h3>
            <p>The mystery movie was: {answerTitle}</p>
            <button type="button" onClick={restartGame}>
              Play again
            </button>
          </div>
        )}

        <div className="legend">
          <div><span className="dot green" /> Correct match</div>
          <div><span className="dot yellow" /> Partial match</div>
          <div><span className="dot red" /> No match / far away</div>
        </div>

        
<div className="guesses">
  {previousGuesses.length === 0 ? (
    <p className="empty-state">Your guesses will appear here.</p>
  ) : (
    previousGuesses.map((item, index) => {
      const feedback = item.result.feedback
      const clues = feedback.clues

      const yearArrow =
        clues.year.direction === 'up'
          ? '↑'
          : clues.year.direction === 'down'
            ? '↓'
            : '↔'

      const ratingArrow =
        clues.rating.direction === 'up'
          ? '↑'
          : clues.rating.direction === 'down'
            ? '↓'
            : '↔'

      return (
        <div
          className="guess-row"
          key={`${feedback.title}-${index}`}
        >
          <div className="guess-heading">
            <strong>
              {index + 1}. {feedback.title} ({feedback.releaseYear})
            </strong>
            <span>
              {item.result.won
                ? 'Correct!'
                : item.result.lost
                  ? 'Final guess'
                  : `${item.result.remainingGuesses} remaining`}
            </span>
          </div>

          <div className="clue-grid">
            <div className={`clue-chip match-${clues.year.match}`}>
              <strong>Year</strong>
              <span>{clues.year.guessed} {yearArrow}</span>
              <small>
                {clues.year.match === 'exact'
                  ? 'Exact year'
                  : clues.year.match === 'close'
                    ? 'Within 5 years'
                    : 'More than 5 years away'}
              </small>
            </div>

            <div className={`clue-chip match-${clues.genre.match}`}>
              <strong>Genre</strong>
              <span>{clues.genre.common} shared</span>
              <small>
                {clues.genre.match === 'exact'
                  ? 'All genres match'
                  : clues.genre.match === 'partial'
                    ? 'Some genres match'
                    : 'No shared genres'}
              </small>
            </div>

            <div className={`clue-chip match-${clues.cast.match}`}>
              <strong>Lead cast</strong>
              <span>
                {clues.cast.common.length > 0
                  ? clues.cast.common.join(', ')
                  : 'No shared actors'}
              </span>
              <small>
                {clues.cast.match === 'exact'
                  ? '3+ shared actors'
                  : clues.cast.match === 'partial'
                    ? 'Some shared actors'
                    : 'No shared actors'}
              </small>
            </div>

            <div className={`clue-chip match-${clues.rating.match}`}>
              <strong>Rating</strong>
              <span>
                {clues.rating.guessed.toFixed(1)} / 10 {ratingArrow}
              </span>
              <small>
                {clues.rating.match === 'exact'
                  ? 'Almost identical'
                  : clues.rating.match === 'close'
                    ? 'Within 1 point'
                    : 'More than 1 point apart'}
              </small>
            </div>
          </div>

          {feedback.hint && (
            <p className="movie-hint">
              <strong>{item.result.guessesUsed >= 4 ? 'Director hint:' : 'Cast hint:'}</strong>{' '}
              {feedback.hint}
            </p>
          )}
        </div>
      )
    })
  )}
</div>
      </section>

      <footer>Built with React, TypeScript, Express, and TMDB.</footer>
    </main>
  )
}

export default App