<script>
import Home from "./views/Home.vue";
import Game from "./views/Game.vue";

export default {
  components: {
    Home,
    Game
  }
};
</script>

<template>
  <div id="app">
      <router-view />
  </div>
</template>
