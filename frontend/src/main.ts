import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import { useThemeStore } from './stores/theme';
import './styles/theme.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
// Resolve + apply the color theme before mounting (sets data-theme on <html>).
useThemeStore();
app.mount('#app');
