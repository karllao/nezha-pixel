<script setup lang="ts">
import { useI18n } from "@/composables/i18n";
const { t } = useI18n();
</script>

<template>
  <div class="nf pixel-border">
    <h1>404</h1>
    <p>{{ t("notFound.title") }}</p>
    <router-link to="/" class="chip">{{ t("notFound.back") }}</router-link>
  </div>
</template>

<style scoped>
.nf {
  padding: 60px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
}
.nf h1 {
  font-size: 48px;
  color: var(--pixel-accent);
}
.nf p {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  margin: 0;
}
</style>
