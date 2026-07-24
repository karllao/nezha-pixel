import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

// Astro/Vite 不会把 .env.local 自动注入到配置文件的 process.env。
// 根据 CLI 的 mode 显式加载，开发默认读取 .env + .env.local，构建读取
// .env.production + .env.production.local；--mode xxx 同样会正确生效。
const modeIndex = process.argv.indexOf("--mode");
const mode =
  modeIndex >= 0 && process.argv[modeIndex + 1]
    ? process.argv[modeIndex + 1]
    : process.argv.some((arg) => arg === "build")
      ? "production"
      : "development";
const env = loadEnv(mode, process.cwd(), "");
const apiTarget = env.VITE_API_TARGET || "http://localhost:8008";
const wsTarget = env.VITE_WS_TARGET || apiTarget.replace(/^http/i, "ws");
const secure = env.VITE_API_INSECURE !== "1";

export default defineConfig({
  output: "static",
  vite: {
    server: {
      proxy: {
        "/api/v1/ws/server": {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          secure,
          headers: { Origin: apiTarget },
        },
        "/api/v1": {
          target: apiTarget,
          changeOrigin: true,
          secure,
          cookieDomainRewrite: "",
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name].[hash].js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[hash][extname]",
        },
      },
    },
  },
});
