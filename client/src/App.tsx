import { useState } from 'react'
import './App.css'

function App() {
  const [guess, setGuess] = useState('')
  const [guesses, setGuesses] = useState<string[]>([])

  function handleGuess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = guess.trim()
    if (!title || guesses.length >= 6) return

    setGuesses([...guesses, title])
    setGuess('')
  }

  return (
    <main className="game">
      <header className="header">
        <h1>🎬 MOVIEDLE</h1>
        <p>Guess the movie. Match the clues.</p>
      </header>

      <section className="game-panel">
        <div className="status">
          <span>UNLIMITED MODE</span>
          <span>{guesses.length} / 6 guesses</span>
        </div>

        <h2>Guess the mystery movie</h2>
        <p className="hint">
          Enter a movie title to get started.
        </p>

        <form className="guess-form" onSubmit={handleGuess}>
          <input
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            placeholder="e.g. Interstellar"
            aria-label="Movie title"
          />
          <button type="submit">Guess</button>
        </form>

        <div className="legend">
          <div><span className="dot green" /> Correct match</div>
          <div><span className="dot yellow" /> Partial match</div>
          <div><span className="dot gray" /> No match</div>
        </div>

        <div className="guesses">
          {guesses.length === 0 ? (
            <p className="empty-state">
              Your guesses will appear here.
            </p>
          ) : (
            guesses.map((title, index) => (
              <div className="guess-row" key={`${title}-${index}`}>
                <span>{index + 1}.</span>
                <strong>{title}</strong>
                <span className="pending">Awaiting comparison</span>
              </div>
            ))
          )}
        </div>
      </section>

      <footer>Built with React and TypeScript.</footer>
    </main>
  )
}

export default App