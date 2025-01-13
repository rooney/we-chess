<template>
  <div class="app">
    <h1>Vue Chess Game</h1>
    <ChessGame />
  </div>
</template>

<script>
import ChessGame from './components/ChessGame.vue'

export default {
  name: 'App',
  components: {
    ChessGame
  }
}
</script>

<style>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}
</style>