<script setup lang="ts">
import { useI18n } from "@/composables/i18n";
defineProps<{ version?: string }>();
const { t } = useI18n();
</script>

<template>
  <footer class="px-footer">
    <div class="container row">
      <a
        href="https://github.com/karllao/nezha-pixel"
        target="_blank"
        rel="noreferrer"
        class="brand-link"
      >
        © Nezha Pixel
      </a>
      <span class="spacer" />
      <span v-if="version" class="chip">v{{ version }}</span>
      <a
        href="https://github.com/nezhahq/nezha"
        target="_blank"
        rel="noreferrer"
      >
        {{ t("footer.poweredBy") }}
      </a>
    </div>
  </footer>
</template>

<style scoped>
.px-footer {
  background: var(--pixel-bg-alt);
  border-top: 4px solid var(--pixel-border);
  padding: 14px 0;
  font-size: 16px;
}
.brand-link {
  color: var(--pixel-text-dim);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.brand-link:hover {
  color: var(--pixel-accent);
}
</style>
