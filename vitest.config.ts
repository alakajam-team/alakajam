import * as path from "path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    // esbuild doesn't emit decorator metadata, which TypeORM entities rely on
    swc.vite({
      jsc: {
        target: "es2017",
        parser: { syntax: "typescript", decorators: true, tsx: true },
        transform: { legacyDecorator: true, decoratorMetadata: true }
      }
    })
  ],
  resolve: {
    alias: {
      server: path.resolve(__dirname, "server")
    }
  },
  test: {
    include: ["server/**/*.spec.ts"],
    setupFiles: ["server/scripts/vitest-setup.ts"],
    env: {
      CONFIG_PATH: "server/scripts/test-config.js"
    },
    // Specs share a single sqlite database
    fileParallelism: false
  }
});
