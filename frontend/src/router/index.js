import { createRouter, createWebHistory } from "vue-router";
import Accueil from "../views/accueil.vue";
import Room from "../views/room.vue";
import Game from "../views/game.vue";

const routes = [
    { path: "/", component: Accueil },
    { path: "/room/:roomId", component: Room },
    { path: "/game/:roomId", component: Game },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;