<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useWebSocketStore } from "@/composables/websocket";
import { useI18n } from "@/composables/i18n";

defineProps<{ siteName: string }>();

const ws = useWebSocketStore();
const { t, locale, setLocale } = useI18n();

const theme = ref<"dark" | "light">(
  (localStorage.getItem("nezha-pixel-theme") as "dark" | "light") || "dark",
);

watch(
  theme,
  (val) => {
    document.documentElement.setAttribute("data-theme", val);
    localStorage.setItem("nezha-pixel-theme", val);
  },
  { immediate: true },
);

onMounted(() => {
  document.documentElement.setAttribute("data-theme", theme.value);
});

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}

function toggleLocale() {
  setLocale(locale.value === "zh-CN" ? "en" : "zh-CN");
}

const statusLabel = computed(() => {
  if (ws.connected) return t("status.online");
  if (ws.reconnectAttempts > 0)
    return `${t("status.reconnect")} x${ws.reconnectAttempts}`;
  return t("status.offline");
});

const statusClass = computed(() => (ws.connected ? "ok" : "danger"));
</script>

<template>
  <header class="px-header">
    <div class="container row">
      <router-link to="/" class="brand">
        <span class="logo">▣</span>
        <span class="brand-text">{{ siteName }}</span>
      </router-link>
      <div class="spacer" />
      <nav class="nav row">
        <router-link to="/" class="nav-link">{{ t("nav.servers") }}</router-link>
        <router-link to="/services" class="nav-link">{{
          t("nav.services")
        }}</router-link>
      </nav>
      <span class="chip" :class="statusClass">● {{ statusLabel }}</span>
      <button class="chip btn" @click="toggleLocale" :title="`Locale: ${locale}`">
        {{ locale === "zh-CN" ? "中" : "EN" }}
      </button>
      <button
        class="chip btn"
        @click="toggleTheme"
        :title="theme === 'dark' ? t('theme.dark') : t('theme.light')"
      >
        {{ theme === "dark" ? "☀" : "☾" }}
      </button>
      <a href="/dashboard" class="chip btn admin" :title="t('nav.admin')">
        ⚙ {{ t("nav.admin") }}
      </a>
    </div>
  </header>
</template>

<style scoped>
.px-header {
  background: var(--pixel-bg-alt);
  border-bottom: 4px solid var(--pixel-border);
  padding: 14px 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--pixel-font-text);
  font-size: 18px;
  color: var(--pixel-text);
}

.logo {
  color: var(--pixel-accent);
  font-size: 28px;
  line-height: 1;
}

.brand-text {
  letter-spacing: 0;
}

.nav {
  gap: 12px;
}

.nav-link {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  
  color: var(--pixel-text-dim);
  padding: 6px 10px;
  border: 2px solid transparent;
}

.nav-link.router-link-exact-active,
.nav-link:hover {
  color: var(--pixel-accent);
  border-color: var(--pixel-accent);
}

.btn {
  cursor: pointer;
  background: var(--pixel-bg);
  color: var(--pixel-text);
}

.admin {
  background: var(--pixel-accent-2);
  color: var(--pixel-on-accent);
  border-color: var(--pixel-accent-2);
  text-decoration: none;
}

.admin:hover {
  background: var(--pixel-accent);
  border-color: var(--pixel-accent);
  color: var(--pixel-on-accent);
}

@media (max-width: 640px) {
  .px-header {
    padding: 10px 0;
  }
  .nav {
    gap: 4px;
  }
  .nav-link {
    padding: 5px 7px;
    font-size: 12px;
  }
  .brand-text {
    font-size: 13px;
  }
  .logo {
    font-size: 22px;
  }
}

@media (max-width: 380px) {
  /* 极窄屏隐藏 brand 文字，只留 logo */
  .brand-text {
    display: none;
  }
  /* 状态 chip 在极窄屏只保留圆点 */
  .nav {
    gap: 2px;
  }
  .nav-link {
    padding: 4px 6px;
    font-size: 11px;
  }
}
</style>
