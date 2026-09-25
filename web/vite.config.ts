import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The UI shows the same version as the binary, read from the crate manifest.
const version = readFileSync(new URL("../Cargo.toml", import.meta.url), "utf8").match(
  /^version = "(.+)"$/m,
)?.[1];

export default defineConfig({
  plugins: [react()],
  define: {
    __TEKS_VERSION__: JSON.stringify(version ?? "dev"),
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8026",
    },
  },
});
