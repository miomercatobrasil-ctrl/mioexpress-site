import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 80],
  },
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
    return [
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
