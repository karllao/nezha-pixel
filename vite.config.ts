import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_TARGET || "http://localhost:8008";
  const wsTarget =
    env.VITE_WS_TARGET ||
    apiTarget.replace(/^http/i, (m) => (m === "HTTP" ? "WS" : "ws"));
  const secure = env.VITE_API_INSECURE !== "1";

  return {
    base: "/",
    plugins: [vue()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api/v1/ws/server": {
          target: wsTarget,
          changeOrigin: true,
          ws: true,
          secure,
          headers: {
            Origin: apiTarget,
          },
        },
        "/api/v1": {
          target: apiTarget,
          changeOrigin: true,
          secure,
          cookieDomainRewrite: "",
        },
      },
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
    build: {
      outDir: "dist",
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name].[hash].js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[hash].[ext]",
        },
      },
    },
  };
});
