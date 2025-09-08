import './assets/main.css'

import { createApp } from 'vue'
import { io } from "socket.io-client";
import App from './App.vue'
import router from '/src/router'
createApp(App).use(router).mount('#app')





