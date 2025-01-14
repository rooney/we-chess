<template>
  <div class="chess-game">
    <TheChessboard
      @board-created="onBoardCreated"
      @move="onMove"
      @checkmate="onCheckmate"
      @stalemate="onStalemate"
      :reactive-config="true"
      :boardConfig="{
        drawable: {
          enabled: true,
          eraseOnClick: false,
          autoShapes: getPossibleMoves(),
        }
      }"
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
import { Chess, type Move } from 'chess.js'
import { type Api as ChessgroundApi } from 'chessground/api'
import type { DrawShape } from 'chessground/draw'
import { ref, onMounted } from 'vue'
import { type BoardApi as ChessboardApi, type BoardState, type PieceColor, TheChessboard } from 'vue3-chessboard'
import 'vue3-chessboard/style.css'

const position = ref<string>('start')
const orientation = ref<'white' | 'black'>('white')
const gameOver = ref<boolean>(false)
const gameOverMessage = ref<string>('')

let game: Chess = new Chess()
let board: ChessboardApi
let ground: ChessgroundApi
let state: BoardState

function getPossibleMoves(): DrawShape[] {
  if (game.turn() === 'b') return [];
  return game.moves({ verbose: true }).map(move => ({ orig: move.to, brush: 'yellow' }));
}

const onBoardCreated = (newBoard: ChessboardApi) => {
  board = newBoard
  ground = (board as any).board
  state = (board as any).boardState
  game = (board as any).game
}

const onMove = (move: Move) => {
  console.log('move', move)
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