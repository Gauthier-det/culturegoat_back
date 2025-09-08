import { createRouter, createWebHistory } from "vue-router";
import Accueil from "../views/Home.vue";
import Room from "../views/Room.vue";
import Game from "../views/Game.vue";

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