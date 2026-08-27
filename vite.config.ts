import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mcpPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      devOptions: { enabled: false },
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/, /^\/functions/, /^\/__l5e\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
          skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "cmg-html",
              networkTimeoutSeconds: 1,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 },
            },
          },
          {
            // Lesson PDFs & CDN assets: always fresh, never stale.
            urlPattern: ({ url }) => url.pathname.startsWith("/__l5e/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "cmg-l5e-assets",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Supabase Storage (lesson PDFs uploaded to buckets) — always fresh.
            urlPattern: ({ url }) => /\.supabase\.co\/storage\/v1\/object\//.test(url.href),
            handler: "NetworkFirst",
            options: {
              cacheName: "cmg-supabase-storage",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 12 },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\.(?:js|css|woff2|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname),
            handler: "NetworkFirst",
            options: {
              cacheName: "cmg-assets",
              networkTimeoutSeconds: 2,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
