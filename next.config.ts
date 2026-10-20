import type { NextConfig } from "next";

// Na Cloudflare Pages (CF_PAGES=1) ou com STATIC_EXPORT=1 o site é exportado como arquivos estáticos (pasta out/).
// Redirects e cabeçalhos ficam em public/_redirects e public/_headers nesse caso.
const isStatic = process.env.CF_PAGES === "1" || process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStatic ? { output: "export" as const, trailingSlash: true } : {}),
  images: isStatic
    ? { loader: "custom", loaderFile: "./src/lib/image-loader.ts" }
    : { formats: ["image/avif", "image/webp"], qualities: [70, 80] },
  ...(isStatic
    ? {}
    : {
        async redirects() {
          // Possíveis caminhos do site antigo (GoDaddy Website Builder) -> âncoras do novo site.
          return [
            { source: "/fale-conosco", destination: "/#contato", permanent: true },
            { source: "/contato", destination: "/#contato", permanent: true },
            { source: "/inicio", destination: "/", permanent: true },
            { source: "/home", destination: "/", permanent: true },
          ];
        },
        async headers() {
          return [{ source: "/models/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
        },
      }),
};

export default nextConfig;
