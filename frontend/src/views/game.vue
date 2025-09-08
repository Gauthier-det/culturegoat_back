<script setup>
import { ref, onMounted } from "vue";
import { useRoute, onBeforeRouteLeave } from "vue-router";
import socket from "@/socket";

const route = useRoute();
const roomId = route.params.roomId;
const pseudo = route.query.pseudo;

const currentQuestion = ref(null);
const options = ref([]);
const timeLeft = ref(0);
const players = ref({});
const gameOver = ref(false);

let timerInterval;

let answered = false;

onBeforeRouteLeave((to, from, next) => {
  if (to.path.includes("/room")) {
    from(false);
    next(false); 
  } else {
    next();
  }
});

onMounted(() => {
  socket.emit("ready", roomId);

  socket.on("newQuestion", (q) => {
    currentQuestion.value = q.question;
    options.value = q.options;
    timeLeft.value = q.time;
    answered = false;
    startTimer();
  });

  socket.on("updatePlayers", (room) => {
    players.value = room.players;
  });

  socket.on("gameOver", (finalPlayers) => {
    gameOver.value = true;
    players.value = finalPlayers;
    clearInterval(timerInterval);
  });
});

function sendAnswer(answer) {
  answered = true;
  socket.emit("answer", { roomId, answer });
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 0) {
      answered = false;
      clearInterval(timerInterval);
    }
  }, 1000);
}
</script>

<template>
  <div>
    <h1>Partie - Room {{ roomId }}</h1>

    <div v-if="!gameOver">
      <h2>{{ currentQuestion }}</h2>
      <p>Temps restant : {{ timeLeft }}s</p>
      <div class="game-options">
        <button v-for="opt in options" :key="opt" @click="sendAnswer(opt)" :disabled="answered" :class="{ clicked: answered }">
          {{ opt }}
        </button>
      </div>

      <h3>Scores</h3>
      <ul>
        <li v-for="(p, id) in players" :key="id">{{ p.name }} - {{ p.score }}</li>
      </ul>
    </div>

    <div v-else>
      <h2>Fin de la partie 🎉</h2>
      <ul>
        <li v-for="(p, id) in players" :key="id">{{ p.name }} - {{ p.score }}</li>
      </ul>
    </div>
  </div>
</template>
