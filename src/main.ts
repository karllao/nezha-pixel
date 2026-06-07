import { createApp } from "vue";
import { createPinia } from "pinia";
import PixelUI from "@mmt817/pixel-ui";
import "@mmt817/pixel-ui/dist/index.css";

import App from "./App.vue";
import router from "./router";
import "./styles/global.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(PixelUI);
app.mount("#app");
