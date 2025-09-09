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

let answered = ref(false);

// Empêche de revenir en arrière vers la room
onBeforeRouteLeave((to, from, next) => {
  if (to.path.includes("/room")) {
    from(false);
    next(false); 
  } else {
    next();
  }
});

onMounted(() => {
  // Joueur prêt
  socket.emit("ready", roomId);

  // Réception des questions
  socket.on("newQuestion", (q) => {
    currentQuestion.value = q.question;
    options.value = q.options;
    timeLeft.value = q.time;
    answered.value = false;
    // startTimer();
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

// Envoi de la réponse du joueur
function sendAnswer(answer) {
  answered.value = true;
  socket.emit("answer", { roomId, answer });
}

</script>

<template>
  <div>
    <h1>Partie - Room {{ roomId }}</h1>

    <div v-if="!gameOver">
      <h2>{{ currentQuestion }}</h2>
      <p>Temps restant : {{ timeLeft }}s</p>
      <div class="game-options">
        <button v-for="opt in options" :key="opt" @click="sendAnswer(opt)" :disabled="answered" :class="{ clicked: answered.value }">
          {{ opt }}
        </button>
      </div>
    </div>

    <div v-else>
      <h2>Fin de la partie 🎉</h2>
      <h3>Scores finaux :</h3>
      <ul>
        <li v-for="(p, id) in players" :key="id">{{ p.name }} - {{ p.score }}</li>
      </ul>
    </div>
  </div>
</template>
