<template>
  <div class="chess-game">
    <TheChessboard
      :player-color="'grey' as MoveableColor /* in ambiguous chess, you move opposite color's pieces,
                                                hence grey */"
      :boardConfig="{
        coordinates: true,
        drawable: {
          enabled: true,
          eraseOnClick: false,
          autoShapes: drawReachableSquares(),
        },
        events: {
          select: onClick,
        }
      }"
      @board-created="onBoardCreated"
      @checkmate="onCheckmate"
      @stalemate="onStalemate"
    />
    <div class="controls">
      <button @click="resetGame">Reset Game</button>
      <button @click="flipBoard">Flip Board</button>
    </div>
    <div v-if="gameOver" class="game-over">
      Game Over! {{ gameOverMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PieceSymbol } from 'chess.js'
import type { Api as ChessgroundApi } from 'chessground/api'
import type { DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'
import type { BoardApi as ChessboardApi, MoveableColor, PieceColor } from 'vue3-chessboard'
import { Chess, BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK } from 'chess.js'
import { TheChessboard } from 'vue3-chessboard'
import { ref, onMounted } from 'vue'
import { Engine } from './Engine'
import 'vue3-chessboard/style.css'

const position = ref<string>('start')
const orientation = ref<'white' | 'black'>('white')
const gameOver = ref<boolean>(false)
const gameOverMessage = ref<string>('')

const game = new Chess()
const engine: Engine = new Engine()
let board: ChessboardApi | undefined
let ground: ChessgroundApi | undefined
let pick:
  { squares: Map<Key, Key[]>, primed?: Key } | /* pick a square you want to occupy */
  { antipieces: Key[], antisquare: Key }     | /* pick an opponent's piece (antipiece) to be moved ...
                                                  ... to the square chosen by the opponent (antisquare) */
  null // nothing to pick (opponent's turn)
  = { squares: getReachableSquares() }

function getReachableSquares(): Map<Key, Key[]> {
  const targets = new Map<Key, Key[]>();
  ([PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING] as PieceSymbol[]).forEach(piece => 
    game.moves({ piece, verbose: true }).forEach(move => {
      if (!targets.get(move.to)) targets.set(move.to, [])
      targets.get(move.to)!.push(move.from)
    }))
  return targets;
}

function drawReachableSquares(): DrawShape[] {
  const shapes: DrawShape[] = getReachableSquares().entries().map(([square, origins]) => {
    return {
      orig: square as Key,
      brush: pick && 'primed' in pick && pick.primed == square ? 'green' : 'yellow',
      label: origins.length > 1 ? { text: '!' } : undefined,
    }
  }).toArray();
  if (pick && 'primed' in pick) {
    const targetSquare = pick.primed as Key
    const ablePieces = pick.squares.get(targetSquare) || []
    ablePieces.forEach(piece => {
      shapes.push({
        orig: piece,
        dest: targetSquare,
        brush: 'green',
        modifiers: { hilite: true, lineWidth: 6 },
      })
    })
  }
  return shapes;
}

function markAntipieces(): DrawShape[] {
  if (pick && 'antipieces' in pick) {
    const antisquare = pick.antisquare
    return pick.antipieces.flatMap(antipiece => [
      { brush: 'green', orig: antipiece },
      { brush: 'green', orig: antipiece, dest: antisquare, modifiers: { hilite: true, lineWidth: 6 }}
    ])
  }
  return []
}

const onBoardCreated = (newBoard: ChessboardApi) => {
  board = newBoard;
  (board as any).game = game
  ground = (board as any).board
}

const onClick = (clicked: Key) => {
  if (!pick) return
  if ('primed' in pick && pick.primed === clicked) {
    const currentFen = game.fen()
    const ablePieces = pick.squares.get(clicked) || []
    const moveOptions = ablePieces.map(piece => `${piece}${clicked}`)
    const timePerOption = 2000 / moveOptions.length

    pick = null
    ground?.setAutoShapes([])

    Promise.all(moveOptions.map(move => engine.analyze(currentFen, move, timePerOption)))
    .then(engineOutput => {
      console.log('engine out:', engineOutput);
      return engineOutput.sort((a, b) => a.score - b.score)[0]
    })
    .then(({ move, countermove }) => {
      board?.move(move)
      const antisquare = countermove.slice(2) as Key
      const antipieces = getReachableSquares().get(antisquare) || []
      pick = { antipieces, antisquare }
      ground?.setAutoShapes(markAntipieces())
    })
    return
  }
  if ('squares' in pick) {
    if (pick.squares.has(clicked)) {
      pick = { squares: pick.squares, primed: clicked }
      ground?.setAutoShapes(drawReachableSquares())
    }
    return
  }
  if ('antipieces' in pick && pick.antipieces.includes(clicked)) {
    board?.move({ from: clicked, to: pick.antisquare })
    pick = { squares: getReachableSquares() }
    ground?.setAutoShapes(drawReachableSquares())
    return
  }
}

const onCheckmate = (checkmatedColor: PieceColor) => {
  gameOver.value = true
  gameOverMessage.value = `Checkmate! ${checkmatedColor === 'white' ? 'Black' : 'White'} wins!`
}

const onStalemate = () => {
  gameOver.value = true
  gameOverMessage.value = 'Stalemate!'
}

const resetGame = (): void => {
  position.value = 'start'
  gameOver.value = false
  gameOverMessage.value = ''
}

const flipBoard = (): void => {
  orientation.value = orientation.value === 'white' ? 'black' : 'white'
}

onMounted(() => {
  console.log('Chess game component mounted')
})

</script>

<style scoped>
.chess-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.controls {
  display: flex;
  gap: 10px;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
}

button:hover {
  background-color: #45a049;
}

.game-over {
  font-size: 20px;
  font-weight: bold;
  color: #e44d26;
  margin-top: 20px;
}
</style>