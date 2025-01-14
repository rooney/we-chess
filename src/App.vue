<template>
  <div class="app">
    <h1>We Chess</h1>
    <ChessGame />
  </div>
</template>

<script setup lang="ts">
import ChessGame from './components/ChessGame.vue'
</script>

<style>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}
</style>