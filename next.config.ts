import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),

  // ─── Performance: only compile the icons/components actually imported ───────
  // This is the PRIMARY fix for the slow first-page load.  Without it, Next.js
  // barrel-imports the entire lucide-react package (1 000+ icons) and all of
  // recharts on every page that uses even a single icon/chart component.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  // ─── Turbopack configuration ─────────────────────────────────────────────────
  turbopack: {
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },

  // ─── Webpack fallback (used for `next build` and some edge cases) ────────────
  webpack: (config) => {
    const projectNodeModules = path.join(__dirname, "node_modules");

    // Ensure resolution uses this project's node_modules, not a parent workspace
    config.resolve = config.resolve ?? {};
    config.resolve.modules = [
      projectNodeModules,
      ...(Array.isArray(config.resolve.modules)
        ? config.resolve.modules
        : ["node_modules"]),
    ];
    config.resolve.roots = [
      __dirname,
      ...(Array.isArray(config.resolve.roots) ? config.resolve.roots : []),
    ];
    config.context = __dirname;

    // Patch postcss-loader so it resolves tailwindcss from the project root
    // and not from a parent directory (fixes "Can't resolve 'tailwindcss'" error).
    function patchPostcssLoader(rules: unknown[]): void {
      for (const rule of rules) {
        if (!rule || typeof rule !== "object") continue;
        const r = rule as Record<string, unknown>;

        if (Array.isArray(r.oneOf)) patchPostcssLoader(r.oneOf);
        if (Array.isArray(r.rules)) patchPostcssLoader(r.rules);

        if (!Array.isArray(r.use)) continue;
        for (const loader of r.use) {
          if (!loader || typeof loader !== "object") continue;
          const l = loader as Record<string, unknown>;
          if (
            typeof l.loader === "string" &&
            l.loader.includes("postcss-loader")
          ) {
            l.options = (l.options as Record<string, unknown>) ?? {};
            const opts = l.options as Record<string, unknown>;
            if (!opts.postcssOptions) {
              opts.postcssOptions = {
                config: path.join(__dirname, "postcss.config.mjs"),
              };
            } else if (
              typeof opts.postcssOptions === "object" &&
              opts.postcssOptions !== null
            ) {
              const po = opts.postcssOptions as Record<string, unknown>;
              if (!po.config) {
                po.config = path.join(__dirname, "postcss.config.mjs");
              }
            }
          }
        }
      }
    }

    if (config.module && Array.isArray(config.module.rules)) {
      patchPostcssLoader(config.module.rules);
    }

    return config;
  },
};

export default nextConfig;
