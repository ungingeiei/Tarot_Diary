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

  // --- ADDED: keep mysql2 out of the bundle.
  // By default Next compiles server dependencies INTO its own chunks,
  // which works for the app but leaves nothing in node_modules. That
  // breaks scripts/migrate.mjs, which runs on its own — outside Next —
  // and does `import mysql from "mysql2/promise"` at runtime. In the
  // container it found no such module and the database schema could
  // never be loaded.
  //
  // Listing it here keeps it external, so the standalone tracer copies
  // the real package into .next/standalone/node_modules and both the
  // app and the script resolve the same one. It is also the generally
  // recommended treatment for a database driver.
  serverExternalPackages: ["mysql2"],
};

export default nextConfig;
