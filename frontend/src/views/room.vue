<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import socket from "@/socket"; // une seule instance partagée

const route = useRoute();
const router = useRouter();

const roomId = route.params.roomId;
const pseudo = route.query.pseudo;
const isHost = route.query.host === "true";

const players = ref({});

socket.emit("joinRoom", { roomId, playerName: pseudo, isHost });

socket.on("updatePlayers", (room) => {
  players.value = room.players;
});

function startGame() {
  socket.emit("prepareGame", roomId); // tous les joueurs vont sur /game
}

socket.on("gameStarting", () => {
  router.push(`/game/${roomId}?pseudo=${pseudo}`);
});
</script>

<template>
  <div>
    <h1>Room {{ roomId }}</h1>
    <ul>
      <li v-for="(p, id) in players" :key="id">{{ p.name }} - {{ p.score }}</li>
    </ul>

    <button v-if="isHost" @click="startGame">Démarrer la partie</button>
    <p v-else>En attente de l'host...</p>
  </div>
</template>
