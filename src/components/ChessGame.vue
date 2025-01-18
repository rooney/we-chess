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
import { Engine } from './Engine'
import { ref, type Ref, watch } from 'vue'
import 'vue3-chessboard/style.css'

const position = ref<string>('start')
const orientation = ref<'white' | 'black'>('white')
const gameOver = ref<boolean>(false)
const gameOverMessage = ref<string>('')

type PickSquare = { squares: Map<Key, Key[]> }              /* pick a square you want to occupy */
type PickSquarePrimed = PickSquare & { primed: Key }       /* primed: click again to confirm */
type PickAntipiece = { antipieces: Key[], antisquare: Key } /* pick an opponent's piece to */
type OpponentsTurn = { wait: true }
type State = PickSquare | PickSquarePrimed | PickAntipiece | OpponentsTurn

const game = new Chess()
const engine: Engine = new Engine()
let board: ChessboardApi | undefined
let ground: ChessgroundApi | undefined
let state: Ref<State> = ref({ squares: getReachableSquares() })

function setState(newState: State) {
  state.value = newState
}

function isSquaring(state: Ref<any>): state is Ref<PickSquare> {
  return 'squares' in state.value
}

function isPrimed(state: Ref<any>): state is Ref<PickSquarePrimed> {
  return 'primed' in state.value
}

function isAntipiecing(state: Ref<any>): state is Ref<PickAntipiece> {
  return 'antipieces' in state.value
}

function isOpponentsTurn(state: Ref<any>): state is Ref<OpponentsTurn> {
  return state.value === null
}

watch(state, () => ground?.setAutoShapes(
  isSquaring(state) ? drawReachableSquares() :
  isAntipiecing(state) ? markAntipieces() :
  []
))

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
  const shapes: DrawShape[] = getReachableSquares().entries().map(([square, origins]) => ({
    orig: square,
    brush: square === (isPrimed(state) && state.value.primed) ? 'green' : 'yellow',
    label: origins.length > 1 ? { text: '!' } : undefined,
  })).toArray();
  
  if (isPrimed(state)) {
    const targetSquare = state.value.primed
    const ablePieces = state.value.squares.get(targetSquare) || []
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
  if (isAntipiecing(state)) {
    return state.value.antipieces.flatMap(antipiece => [
      { brush: 'green', orig: antipiece },
      { brush: 'green', orig: antipiece, dest: state.value.antisquare, modifiers: {
        hilite: true, 
        lineWidth: 6,
      }}
    ])
  }
  return []
}

const onBoardCreated = (newBoard: ChessboardApi) => {
  board = newBoard;
  (board as any).game = game
  ground = (board as any).board
}

const onClick = (clicked: Key): void => {
  if (isOpponentsTurn(state)) return
  if (isPrimed(state) && state.value.primed === clicked) {
    const currentFen = game.fen()
    const ablePieces = state.value.squares.get(clicked) || []
    const moveOptions = ablePieces.map(piece => `${piece}${clicked}`)
    const timePerOption = 2000 / moveOptions.length

    Promise.all(moveOptions.map(move => engine.analyze(currentFen, move, timePerOption)))
    .then(engineOutput => engineOutput.sort((a, b) => a.score - b.score)[0])
    .then(({ move, countermove }) => {
      board?.move(move)
      const antisquare = countermove.slice(2) as Key
      const antipieces = getReachableSquares().get(antisquare) || []
      setState({ antipieces, antisquare })
    })
    return setState({ wait: true})
  }
  if (isSquaring(state) && state.value.squares.has(clicked)) {
    return setState({ ...state.value, primed: clicked })
  }
  if (isAntipiecing(state) && state.value.antipieces.includes(clicked)) {
    board?.move({ from: clicked, to: state.value.antisquare })
    return setState({ squares: getReachableSquares() })
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