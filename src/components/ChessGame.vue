<template>
  <div class="chess-game">
    <TheChessboard
      :position="position"
      @onMove="onMove"
      :orientation="orientation"
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
import { ref } from 'vue'
import { TheChessboard } from 'vue3-chessboard'
import 'vue3-chessboard/style.css'

interface ChessMove {
  fen: string
  checkmate: boolean
  stalemate: boolean
  turn: 'w' | 'b'
}

const position = ref<string>('start')
const orientation = ref<'white' | 'black'>('white')
const gameOver = ref<boolean>(false)
const gameOverMessage = ref<string>('')

const onMove = (move: ChessMove): void => {
  position.value = move.fen
  if (move.checkmate) {
    gameOver.value = true
    gameOverMessage.value = `Checkmate! ${move.turn === 'w' ? 'Black' : 'White'} wins!`
  } else if (move.stalemate) {
    gameOver.value = true
    gameOverMessage.value = 'Stalemate!'
  }
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