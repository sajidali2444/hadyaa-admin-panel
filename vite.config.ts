import { defineConfig, loadEnv } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { nitro } from "nitro/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

function resolveProxyTarget(rawBaseUrl?: string): string {
  if (!rawBaseUrl) {
    return "http://localhost:5000";
  }

  const trimmed = rawBaseUrl.trim();
  if (trimmed.length === 0 || trimmed.startsWith("/")) {
    return "http://localhost:5000";
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return "http://localhost:5000";
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = resolveProxyTarget(env.VITE_API_BASE_URL);

  return {
    server: {
      port: 3000,
      host: "::",
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      devtools(),
      nitro(),
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
      tanstackStart({
        srcDirectory: "src",
      }),
      viteReact(),
    ],
  };
});
