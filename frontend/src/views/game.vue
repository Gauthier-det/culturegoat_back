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
const clickedOption = ref(null);
const type = ref(null);

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
    type.value = q.type;
    console.log("type de question : " , type.value);
    answered.value = false;
    clickedOption.value = null;
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

// Envoi de la réponse du joueur
function sendAnswer(answer) {
  if(type.value === 'qcm'){
    clickedOption.value = answer;
    console.log("Option cliquée :", clickedOption.value);
    answered.value = true;
  }
  else{
    if(options.value.includes(answer)){
      answered.value = true;
      answer = 1;
    }
  }
  socket.emit("answer", { roomId, answer });
}

function startTimer(){
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else {
      clearInterval(timerInterval);
      answered.value = true; 
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
      <div class="qcmQuest" v-if="type === 'qcm'">
        <div class="game-options">
          <button v-for="opt in options" :key="opt" @click="sendAnswer(opt)" :disabled="answered" :class="{ clicked: clickedOption == opt }">
            {{ opt }}
          </button>
        </div>
      </div>
      <div class="openQuest" v-else-if="type === 'open'">
        <div class="game-options">
          <input type="text" v-model="clickedOption" :disabled="answered" placeholder="Votre réponse" />
          <button @click="sendAnswer(clickedOption)" :disabled="answered || !clickedOption">Valider</button>
        </div>
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

<style>
button.clicked {
  background-color: green !important;
  color: white !important;
  border: 2px solid #444;
}
</style>