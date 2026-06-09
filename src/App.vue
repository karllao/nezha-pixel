<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useWebSocketStore } from "@/composables/websocket";
import { useI18n } from "@/composables/i18n";
import { fetchSetting } from "@/api/nezha";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

const ws = useWebSocketStore();
const { setLocale, t } = useI18n();
const siteName = ref(t("nav.servers") === "服务器" ? "哪吒像素监控" : "Nezha Pixel");
const version = ref("");

onMounted(async () => {
  ws.connect("/api/v1/ws/server");
  try {
    const setting = await fetchSetting();
    if (setting.data?.config?.site_name) {
      siteName.value = setting.data.config.site_name;
      document.title = `${siteName.value} · Nezha Pixel`;
    }
    // 只在用户没有手动选过语言时，跟随后端配置
    if (
      setting.data?.config?.language &&
      !localStorage.getItem("nezha-pixel-locale")
    ) {
      const lang = setting.data.config.language;
      if (lang.toLowerCase().startsWith("zh")) setLocale("zh-CN");
      else setLocale("en");
    }
    version.value = setting.data?.version || "";
  } catch (err) {
    console.warn("fetchSetting failed", err);
  }
});

onUnmounted(() => {
  ws.disconnect();
});
</script>

<template>
  <div class="app-shell">
    <AppHeader :site-name="siteName" />
    <main class="container app-main">
      <router-view />
    </main>
    <AppFooter :version="version" />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-main {
  flex: 1;
  padding: 24px 16px 32px;
}
@media (max-width: 640px) {
  .app-main {
    padding: 16px 0 24px;
  }
}
</style>
