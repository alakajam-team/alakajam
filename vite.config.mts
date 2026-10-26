import inject from "@rollup/plugin-inject";
import { defineConfig } from "vite";

/*
 * Builds the client-side bundle (client/scripts/site.ts) into a single classic script,
 * dist/client/scripts/site.js, loaded by server/base.template.tsx.
 *
 * - Production: `vite build` (minified)
 * - Development: `vite build --watch --mode development` (sourcemaps, not minified)
 */
export default defineConfig(({ mode }) => {
  const production = mode === "production";

  return {
    // Only scripts are built here, static files are served by Express
    publicDir: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode)
    },
    plugins: [
      // Legacy code expects jQuery as a free variable (like webpack's ProvidePlugin used to do)
      inject({
        include: "client/scripts/**",
        $: "jquery",
        jQuery: "jquery"
      })
    ],
    build: {
      outDir: "dist/client/scripts",
      emptyOutDir: true, // Only this build writes into dist/client/scripts (Sass writes into sibling folders)
      target: "es2019",
      sourcemap: !production,
      minify: production,
      lib: {
        entry: "client/scripts/site.ts",
        name: "alakajam",
        formats: ["iife"],
        fileName: () => "site.js"
      },
      // NB. IIFE bundles can't be code-split: Vite disables code splitting for them,
      // which also inlines all dynamic imports into site.js
      rolldownOptions: {
        checks: {
          // Rolldown has a built-in `inject`, but the plugin lets us limit injection to our own sources
          preferBuiltinFeature: false
        }
      }
    }
  };
});
