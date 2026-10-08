-- =====================================================================
-- 08_admin_bootstrap.sql — making the first admin
-- =====================================================================
-- There is no "admin sign-up" and no admin login page. An admin is an
-- ordinary account with one column changed:
--
--     accounts.role = 'admin'
--
-- They sign in at /login like anyone else. lib/apiAuth.js re-reads `role`
-- from this table on every request and never trusts the session token for
-- it, so the change takes effect on the next request — no need to sign
-- out and back in.
--
-- Nothing in the app can grant it: /api/auth/register and the Google
-- callback both write 'user' literally, and no route updates `role`.
-- That is deliberate — an endpoint that hands out admin is an endpoint
-- someone can call — but it does mean the FIRST admin has to be made by
-- hand, which is what this file is for.
--
-- It unlocks /addcard (the card console) and every route behind
-- requireAdmin(): /api/admin/cards and /api/admin/cards/image.
-- =====================================================================


-- ---------------------------------------------------------------------
-- OPTION A — promote an account that already exists  (no new password)
-- ---------------------------------------------------------------------
-- The account keeps whatever password it already had. Put its email in
-- and run. Safe to run more than once.

-- UPDATE accounts SET role = 'admin' WHERE email = 'change-me@example.com';


-- ---------------------------------------------------------------------
-- OPTION B — a dedicated admin account  (what this project uses)
-- ---------------------------------------------------------------------
-- `pwd` holds a BCRYPT HASH, never the password itself, so the row cannot
-- be written from plain SQL. Register the account through the app first:
--
--   1. Open /register and sign up with the address you want to use.
--      That writes a correctly hashed password and role 'user'.
--   2. Run the line below with that address.
--
-- Or hash it yourself, from the project root:
--
--   node --env-file=.env -e "
--     const bcrypt = require('bcryptjs');
--     const mysql = require('mysql2/promise');
--     (async () => {
--       const db = await mysql.createConnection({
--         host: process.env.DB_HOST, user: process.env.DB_USER,
--         password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
--         port: Number(process.env.DB_PORT) || 3306,
--       });
--       await db.execute(
--         \"INSERT INTO accounts (f_name, l_name, email, pwd, role, coin, streak) VALUES (?, '', ?, ?, 'admin', 50, 0)\",
--         ['Admin', 'admin@tarotdiary.com', await bcrypt.hash('CHANGE-ME', 10)]
--       );
--       await db.end();
--     })();
--   "
--
-- The password must pass lib/validators/password.js — one uppercase, one
-- lowercase, one digit, one special character, no whitespace — and the
-- register route's own minimum of 8 characters. `email` has no UNIQUE
-- index, so check for the address before inserting or you will get two
-- rows and /api/auth/login will take the first one.

-- UPDATE accounts SET role = 'admin' WHERE email = 'admin@tarotdiary.com';


-- Check it took. Expect the admin account(s) and nothing else.
SELECT id, email, role FROM accounts WHERE role = 'admin';
