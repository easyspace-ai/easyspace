import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * 统一的 Vite 基础配置
 * 用于所有前端应用的共享配置
 */
export const createBaseConfig = (options: {
  root: string;
  port?: number;
  basename?: string;
}) =>
  defineConfig({
    plugins: [react(), tailwindcss()],
        css: {
          // Tailwind v4 使用内置的 PostCSS 处理
        },
    resolve: {
      alias: {
        "@": path.resolve(options.root, "./src"),
        // 统一的包别名
        "@easyspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
        "@easyspace/aitable": path.resolve(
          __dirname,
          "../../packages/aitable/src",
        ),
        "@easyspace/sdk": path.resolve(__dirname, "../../packages/sdk/src"),
      },
    },
    optimizeDeps: {
      include: ["@easyspace/aitable", "@easyspace/sdk", "@easyspace/ui"],
      exclude: ["react-hammerjs"],
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
          },
        },
      },
    },
    define: {
      "import.meta.env.VITE_BASENAME": JSON.stringify(options.basename || ""),
    },
    server: {
      port: options.port || 3000,
      host: true,
    },
  });
