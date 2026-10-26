-- =====================================================================
-- 08_admin_bootstrap.sql — making the first admin
-- =====================================================================
-- An admin is an ordinary account with one column changed:
--
--     accounts.role = 'admin'
--
-- They sign in at /login like anyone else. lib/apiAuth.js re-reads
-- `role` from this table on every request and never trusts the session
-- token for it, so a change takes effect on the next request.
--
-- Nothing in the app can grant it: /api/auth/register and the Google
-- callback both write 'user' literally, and no route updates `role`.
-- That is deliberate — an endpoint that hands out admin is an endpoint
-- someone can call — so the first admin has to be made here.
--
-- It unlocks /addcard (the card console) and every route behind
-- requireAdmin(): /api/admin/cards and /api/admin/cards/image.
--
-- ---------------------------------------------------------------------
-- --- CHANGED: this file used to have every statement commented out.
-- ---------------------------------------------------------------------
-- It ran, reported success, and created nothing — so a fresh database
-- (every `destroy` then `deploy` makes one) came up with no way to
-- reach the admin console at all. It now really creates the account.
--
--     email     admin@tarotdiary.com
--     password  P@ssw0rd1111
--
-- ⚠️  THAT PASSWORD IS IN A COMMITTED FILE, so it is public to anyone
-- who can read this repository, and the same on every deployment. That
-- is acceptable for coursework on a throwaway lab account and is NOT
-- acceptable anywhere real. On anything real, delete the INSERT below,
-- register the account through /register, and promote it with the
-- UPDATE at the bottom instead.
--
-- `pwd` holds a BCRYPT HASH, never the password itself. The hash below
-- was produced with bcryptjs, cost 10 — the same library and cost
-- lib/password.js uses, so /api/auth/login verifies it normally.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Create the admin, but only if that address is not already taken.
-- ---------------------------------------------------------------------
-- `accounts.email` has no UNIQUE index, so a plain INSERT run twice
-- would make two rows and /api/auth/login would silently use whichever
-- came first. The WHERE NOT EXISTS is what keeps this safe to re-run —
-- scripts/migrate.mjs already skips applied files, but the file is also
-- run by hand often enough to matter.
INSERT INTO accounts (f_name, l_name, email, pwd, role, coin, streak)
SELECT 'Admin', '', 'admin@tarotdiary.com', '$2b$10$QRwD/eiMHOwalWtFXiHnUOEMPyLLZeHIcEs9MSVeiweWW8xTddrtW', 'admin', 50, 0
WHERE NOT EXISTS (
    SELECT 1 FROM accounts WHERE email = 'admin@tarotdiary.com'
);

-- If the address existed already as an ordinary account — someone
-- registered it through the app before this ran — promote it rather
-- than leaving a second, unreachable admin row behind. Its own password
-- is kept; only the role changes.
UPDATE accounts SET role = 'admin' WHERE email = 'admin@tarotdiary.com';


-- ---------------------------------------------------------------------
-- Promoting somebody else later
-- ---------------------------------------------------------------------
-- Register the account through /register first, then run:
--
--   UPDATE accounts SET role = 'admin' WHERE email = 'you@example.com';


-- Check it took. Expect exactly one admin.
SELECT id, email, role FROM accounts WHERE role = 'admin';
