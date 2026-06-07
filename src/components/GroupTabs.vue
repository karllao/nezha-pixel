<script setup lang="ts">
defineProps<{
  tabs: { id: string; label: string }[];
  current: string;
}>();

defineEmits<{
  (e: "update:current", val: string): void;
}>();
</script>

<template>
  <div class="tabs">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tab"
      :class="{ active: tab.id === current }"
      @click="$emit('update:current', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 0;
}
.tab {
  font-family: var(--pixel-font-en);
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 6px 10px;
  background: var(--pixel-bg-alt);
  border: 2px solid var(--pixel-border);
  color: var(--pixel-text-dim);
  cursor: pointer;
  white-space: nowrap;
}
.tab:hover {
  color: var(--pixel-text);
}
.tab.active {
  background: var(--pixel-accent);
  color: var(--pixel-on-accent);
  border-color: var(--pixel-accent);
  box-shadow: 2px 2px 0 0 var(--pixel-shadow);
}
</style>
