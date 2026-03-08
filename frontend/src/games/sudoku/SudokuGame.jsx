import { useState, useCallback } from 'react'
import { apiUrl } from '../../api'

// Sample puzzle: 0 = empty. Solution is valid full grid.
const SAMPLE_PUZZLE = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
]

const SAMPLE_GIVEN = SAMPLE_PUZZLE.map((row) => row.map((n) => n !== 0))

function getBox(r, c) {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3)
}

function checkConflicts(grid, r, c, value) {
  if (!value) return false
  // row
  for (let j = 0; j < 9; j++) if (j !== c && grid[r][j] === value) return true
  // col
  for (let i = 0; i < 9; i++) if (i !== r && grid[i][c] === value) return true
  // 3x3
  const br = Math.floor(r / 3) * 3
  const bc = Math.floor(c / 3) * 3
  for (let i = br; i < br + 3; i++)
    for (let j = bc; j < bc + 3; j++)
      if ((i !== r || j !== c) && grid[i][j] === value) return true
  return false
}

export default function SudokuGame() {
  const [grid, setGrid] = useState(SAMPLE_PUZZLE.map((row) => [...row]))
  const [given] = useState(SAMPLE_GIVEN)
  const [selected, setSelected] = useState(null)
  const [saved, setSaved] = useState(false)

  const isGiven = useCallback(
    (r, c) => given[r][c],
    [given]
  )

  const hasError = useCallback(
    (r, c) => {
      const v = grid[r][c]
      return v !== 0 && checkConflicts(grid, r, c, v)
    },
    [grid]
  )

  const setCell = useCallback(
    (r, c, value) => {
      if (given[r][c]) return
      setGrid((prev) => {
        const next = prev.map((row) => [...row])
        next[r][c] = value
        return next
      })
      setSaved(false)
    },
    [given]
  )

  const handleKeyDown = useCallback(
    (e, r, c) => {
      if (given[r][c]) return
      if (e.key >= '1' && e.key <= '9') {
        setCell(r, c, parseInt(e.key, 10))
        e.preventDefault()
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        setCell(r, c, 0)
        e.preventDefault()
      } else if (e.key === 'ArrowUp' && r > 0) setSelected([r - 1, c])
      else if (e.key === 'ArrowDown' && r < 8) setSelected([r + 1, c])
      else if (e.key === 'ArrowLeft' && c > 0) setSelected([r, c - 1])
      else if (e.key === 'ArrowRight' && c < 8) setSelected([r, c + 1])
    },
    [given, setCell]
  )

  const handleSave = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/games/sudoku/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid, given }),
      })
      if (res.ok) setSaved(true)
    } catch {
      setSaved(false)
    }
  }, [grid, given])

  const handleLoad = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/games/sudoku/load'))
      if (!res.ok) return
      const data = await res.json()
      setGrid(data.grid || grid)
    } catch {
      // ignore
    }
  }, [grid])

  const filled = grid.flat().filter(Boolean).length
  const complete = filled === 81 && grid.flat().every((v, i) => {
    const r = Math.floor(i / 9), c = i % 9
    return !checkConflicts(grid, r, c, v)
  })

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <div className="sudoku-grid">
          {grid.map((row, r) =>
            row.map((val, c) => (
              <input
                key={`${r}-${c}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={`sudoku-cell ${given[r][c] ? 'given' : ''} ${hasError(r, c) ? 'error' : ''}`}
                value={val === 0 ? '' : val}
                readOnly={given[r][c]}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(-1)
                  setCell(r, c, v ? parseInt(v, 10) : 0)
                }}
                onFocus={() => setSelected([r, c])}
                onKeyDown={(e) => handleKeyDown(e, r, c)}
                ref={(el) => {
                  if (selected?.[0] === r && selected?.[1] === c) el?.focus()
                }}
                aria-label={`Cell row ${r + 1} column ${c + 1}${val ? ` value ${val}` : ' empty'}`}
              />
            ))
          )}
        </div>
        <div className="d-flex flex-column gap-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleSave}
          >
            {saved ? 'Saved' : 'Save progress'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleLoad}
          >
            Load saved
          </button>
        </div>
      </div>
      {complete && (
        <div className="alert alert-success">Well done! Puzzle complete.</div>
      )}
    </div>
  )
}
