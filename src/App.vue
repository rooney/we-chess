<template>
  <div class="app">
    <h1>Vue Chess Game</h1>
    <ChessGame />
  </div>
</template>

<script setup>
import ChessGame from './components/ChessGame.vue'

// No export default needed in script setup
</script>

<style>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}
</style>