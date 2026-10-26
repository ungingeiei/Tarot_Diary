/**
 * ---------------------------------------------------------------------
 * scripts/migrate.mjs — load public/database/*.sql into the database
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS: on AWS the database sits in a private subnet with no
 * internet route, so MySQL Workbench on a laptop cannot reach it. The
 * schema has to be loaded from something already inside the VPC — and
 * the app container is the one thing that is. This script ships inside
 * the image so it can be run there:
 *
 *   aws ecs execute-command --cluster tarot-diary-cluster \
 *     --task <task-id> --container app --interactive \
 *     --command "node scripts/migrate.mjs"
 *
 * It also works locally:  node --env-file=.env scripts/migrate.mjs
 *
 * SAFE TO RUN TWICE. Every file that succeeds is recorded in a
 * `schema_migrations` table, and a file already recorded is skipped. So
 * a re-run after adding one new .sql file applies only that file, and a
 * re-run after a failure picks up where it stopped.
 *
 * Files run in filename order, which is why they are numbered
 * (00_ERD_V1_2.sql first, then 01_, 02_ …). Order matters: later files
 * ALTER tables the earlier ones create.
 *
 * Reads the same DB_* environment variables as src/lib/db.js, so there
 * is nothing extra to configure in the ECS task definition.
 * ---------------------------------------------------------------------
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

// Inside the container the SQL lives at /app/public/database (the
// Dockerfile copies public/ wholesale). Locally it is the same path
// relative to the repository root, so one default covers both.
const SQL_DIR = process.env.MIGRATIONS_DIR || path.join(process.cwd(), "public", "database");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. This script reads the same DB_* variables as the app.`);
    process.exit(1);
  }
  return value;
}

/**
 * Split a file into statements on semicolons, ignoring the semicolons
 * inside strings and comments.
 *
 * mysql2 refuses multiple statements in one query by default, and
 * turning that option on would also turn on a class of SQL-injection
 * this script does not need. None of the files use DELIMITER, triggers
 * or stored procedures (checked), so a scanner this simple is enough —
 * add one of those and this must be revisited.
 */
function splitStatements(sql) {
  const statements = [];
  let current = "";
  let quote = null; // which quote character we are inside, if any
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") { blockComment = false; i++; }
      continue;
    }
    if (!quote) {
      if (ch === "-" && next === "-") { lineComment = true; i++; continue; }
      if (ch === "#") { lineComment = true; continue; }
      if (ch === "/" && next === "*") { blockComment = true; i++; continue; }
    }

    if (quote) {
      // A doubled or backslash-escaped quote stays inside the string.
      if (ch === "\\") { current += ch + (next ?? ""); i++; continue; }
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
    } else if (ch === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function main() {
  const connection = await mysql.createConnection({
    host: requireEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 3306),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
    multipleStatements: false,
  });

  console.log(`Connected to ${process.env.DB_HOST}/${process.env.DB_NAME}`);

  // The ledger of what has already run. Created first, and by this
  // script rather than by a .sql file, so that a completely empty
  // database can be brought up with one command.
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) NOT NULL,
      applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (filename)
    )`);

  const [rows] = await connection.query("SELECT filename FROM schema_migrations");
  const done = new Set(rows.map((r) => r.filename));

  const files = (await readdir(SQL_DIR)).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) {
    console.error(`No .sql files found in ${SQL_DIR}`);
    process.exit(1);
  }

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) {
      console.log(`  skip    ${file}  (already applied)`);
      continue;
    }

    const sql = await readFile(path.join(SQL_DIR, file), "utf8");
    const statements = splitStatements(sql);
    process.stdout.write(`  apply   ${file}  (${statements.length} statements) … `);

    try {
      for (const statement of statements) {
        await connection.query(statement);
      }
    } catch (error) {
      // Stop at the first failure rather than carrying on: later files
      // depend on earlier ones, so continuing would turn one clear
      // error into a cascade of confusing ones. The ledger is not
      // written, so a fixed re-run retries this same file.
      console.log("FAILED");
      console.error(`\n${file}: ${error.sqlMessage || error.message}`);
      await connection.end();
      process.exit(1);
    }

    await connection.execute("INSERT INTO schema_migrations (filename) VALUES (?)", [file]);
    console.log("ok");
    applied++;
  }

  console.log(applied === 0 ? "\nAlready up to date." : `\nApplied ${applied} file(s).`);
  await connection.end();
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
