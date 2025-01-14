<template>
  <div class="chess-game">
    <TheChessboard
      @board-created="onBoardCreated"
      @move="onMove"
      @checkmate="onCheckmate"
      @stalemate="onStalemate"
      :boardConfig="boardConfig"
      :reactive-config="true"
      player-color="none"
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
import type { Move, PieceSymbol, Square } from 'chess.js'
import type { Api as ChessgroundApi } from 'chessground/api'
import type { DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'
import type { BoardApi as ChessboardApi, PieceColor } from 'vue3-chessboard'
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
let board: ChessboardApi
let ground: ChessgroundApi
let engine: Engine = new Engine(game);

let selectedTarget = '';
function getPossibleMoves(): DrawShape[] {
  console.log(selectedTarget)
  if (game.turn() === 'b') return [];
  return engine.getPossibleTargets().entries().map(([coord, froms]) => {
    return {
      orig: coord as Key,
      brush: froms.length > 1 && coord !== selectedTarget ? 'yellow' : 'green',
      label: froms.length > 1 ? { text: '!' } : undefined,
    }
  }).toArray();
}

const onBoardCreated = (newBoard: ChessboardApi) => {
  board = newBoard;
  (board as any).game = game
  ground = (board as any).board
  engine = new Engine(game, board, ground)
}

const onSelect = (coord: Key) => {
  if (game.turn() === 'b') {
    console.log(engine.options)
    engine.options.forEach((option) => {
      console.log(option)
      if (coord === option) {
        board.move({from: coord, to: engine.target!})
      }
    })
    return;
  }
  const options = engine.getPossibleTargets().get(coord)
  if (!options) return
  if (options.length === 1) return board.move({ from: options[0], to: coord })
  if (coord === selectedTarget) return choose(coord, options)

  let marks: DrawShape[] = options.flatMap(option => [{
    orig: option,
    dest: coord,
    brush: 'green',
    modifiers: {
      hilite: true,
      lineWidth: 6,
    },
  }])

  selectedTarget = coord
  marks = marks.concat(getPossibleMoves())
  ground.setAutoShapes(marks.concat(getPossibleMoves()))
}

const choose = (target: Key, options: Key[]) => {
  board.move({ to: target, from: options[Math.floor(Math.random() * options.length)] })
  selectedTarget = ''
}

const onMove = (move: Move|string) => {
  console.log('move', move)
  const history = board?.getHistory(true);
  const moves = history?.map((move) => {
    if (typeof move === 'object') {
      return move.lan;
    } else {
      return move;
    }
  });

  if (moves) {
    engine?.sendPosition(moves.join(' '));
  }

  ground.setAutoShapes(getPossibleMoves())
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

const boardConfig = {
  coordinates: true,
  drawable: {
    enabled: true,
    eraseOnClick: false,
    autoShapes: getPossibleMoves(),
  },
  events: {
    select: onSelect,
  }
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