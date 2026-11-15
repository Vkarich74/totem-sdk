import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createStagingRouteSafety } from "./stagingRouteSafety.js";

// Normal Production builds: unchanged; no custom rewrite or CSP.
// Staging builds: require explicitly isolated API/app/public origins.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const routeSafety = createStagingRouteSafety({ mode, env });
  return {
    plugins: [react(), ...(routeSafety ? [routeSafety] : [])],
    // Never copy public/assets/index.js or old service-worker JS into staging.
    // Normal Production build retains its original publicDir behavior.
    ...(routeSafety ? { publicDir: false } : {}),
    // Railway's own deploy healthcheck has Host: healthcheck.railway.app.
    // Vite preview responds 403 unless it is explicitly allowed.
    // Strict ONLY for stage; no broad .railway.app wildcard or Production.
    ...(routeSafety ? {
      preview: {
        allowedHosts: [
          "healthcheck.railway.app",
          new URL(env.VITE_STAGE_APP_ORIGIN).hostname,
        ],
      },
    } : {}),
    build: {
      outDir: "dist",
      assetsDir: "assets",
      rollupOptions: {
        output: {
          entryFileNames: "assets/index-[hash].js",
          chunkFileNames: "assets/chunk-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
  };
});
