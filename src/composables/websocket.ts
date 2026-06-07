import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { NezhaWebsocketResponse } from "@/types/nezha";

const MAX_RECONNECT = 30;
const RECONNECT_DELAY = 3000;

export const useWebSocketStore = defineStore("websocket", () => {
  const lastMessage = ref<NezhaWebsocketResponse | null>(null);
  const connected = ref(false);
  const reconnectAttempts = ref(0);
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let isConnecting = false;
  let currentUrl = "";

  const now = computed(() => lastMessage.value?.now ?? 0);
  const servers = computed(() => lastMessage.value?.servers ?? []);

  function cleanup() {
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
      ws = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    connected.value = false;
  }

  function connect(url: string = currentUrl || "/api/v1/ws/server") {
    if (isConnecting) return;
    currentUrl = url;
    cleanup();
    isConnecting = true;

    try {
      const wsUrl = new URL(url, window.location.origin);
      wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
      ws = new WebSocket(wsUrl.toString());

      ws.onopen = () => {
        connected.value = true;
        reconnectAttempts.value = 0;
        isConnecting = false;
      };

      ws.onclose = () => {
        connected.value = false;
        ws = null;
        isConnecting = false;
        if (reconnectAttempts.value < MAX_RECONNECT) {
          reconnectTimer = setTimeout(() => {
            reconnectAttempts.value++;
            connect(currentUrl);
          }, RECONNECT_DELAY);
        }
      };

      ws.onmessage = (event) => {
        try {
          lastMessage.value = JSON.parse(event.data) as NezhaWebsocketResponse;
        } catch (err) {
          console.error("Failed to parse WS message", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error", err);
        isConnecting = false;
      };
    } catch (err) {
      console.error("WebSocket connection error", err);
      isConnecting = false;
    }
  }

  function reconnect() {
    reconnectAttempts.value = 0;
    cleanup();
    setTimeout(() => connect(currentUrl), 500);
  }

  function disconnect() {
    reconnectAttempts.value = MAX_RECONNECT;
    cleanup();
  }

  return {
    lastMessage,
    connected,
    reconnectAttempts,
    now,
    servers,
    connect,
    reconnect,
    disconnect,
  };
});
