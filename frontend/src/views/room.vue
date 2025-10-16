<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import socket from "@/socket"; 

const route = useRoute();
const router = useRouter();

const roomId = route.params.roomId;
const pseudo = sessionStorage.getItem("pseudo");
const isHost = route.query.host === "true";

const players = ref({});

socket.emit("joinRoom", { roomId, playerName: pseudo, isHost });

socket.on("updatePlayers", (room) => {
  players.value = room.players;
});

function startGame() {
  socket.emit("prepareGame", roomId); 
}

socket.on("gameStarting", () => {
  router.push(`/game/${roomId}`);
});
</script>

<template>
  <div>
    <h1>Room {{ roomId }}</h1>
    <ul>
      <li v-for="(p, id) in players" :key="id">{{ p.name }}</li>
    </ul>

    <button v-if="isHost" @click="startGame">Démarrer la partie</button>
    <p v-else>En attente de l'host...</p>
  </div>
</template>
