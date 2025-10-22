<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const pseudo = ref("");
const roomId = ref("");
const router = useRouter();

if(sessionStorage.getItem("pseudo") != null){
  pseudo.value = sessionStorage.getItem("pseudo");
}


function createRoom() {
  let id = Math.random().toString(36).substr(2, 4);
  sessionStorage.setItem("pseudo", pseudo.value);
  sessionStorage.setItem("isHost", true);
  router.push(`/room/${id}`);
}

function joinRoom() {
  sessionStorage.setItem("pseudo", pseudo);
  sessionStorage.setItem("isHost", false);
  router.push(`/room/${roomId.value}`);
}
</script>

<template>
  <div>
    <h1>Bienvenue !</h1>
    <input v-model="pseudo" placeholder="Votre pseudo"/>
    <div class="home-actions">
      <button @click="createRoom">Créer une room</button>

      <div class="join-room">
        <input v-model="roomId" placeholder="ID room" />
        <button @click="joinRoom">Rejoindre</button>
      </div>
    </div>
  </div>
</template>
