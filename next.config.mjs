/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,

  // --- ADDED: build a self-contained server for the container image.
  // Without this, running the app in Docker means copying the whole
  // node_modules tree (hundreds of MB) into the image. "standalone"
  // makes Next trace the files actually imported and emit a small
  // .next/standalone directory that runs with `node server.js`.
  // The Dockerfile depends on this; see infra/terraform/README.md.
  output: "standalone",
};

export default nextConfig;
