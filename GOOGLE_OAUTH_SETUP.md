# Google sign-in setup

The "Continue with Google" button on `/login` uses a hand-written OAuth 2.0
authorization-code flow with PKCE — no `next-auth`, so it issues the same JWT
session cookie as `/api/auth/login` and nothing else in the app has to change.

## Files

| File | Role |
| --- | --- |
| `src/lib/googleOAuth.js` | Config, `state`/PKCE generation, token exchange, `id_token` decoding |
| `src/app/api/auth/google/route.js` | Step 1 — redirects the browser to Google |
| `src/app/api/auth/google/callback/route.js` | Step 2 — verifies, finds/creates the account, sets the session cookie |
| `src/app/login/page.jsx` | The button, plus the `?google=success` return leg |
| `public/database/google_oauth.sql` | Migration: `accounts.google_sub`, nullable `accounts.pwd` |

## 1. Google Cloud Console

1. Create (or open) a project at <https://console.cloud.google.com>.
2. **APIs & Services → OAuth consent screen**: pick *External*, fill in the app
   name and support email. While the app is in *Testing*, only accounts listed
   under **Test users** can sign in — add your own Gmail there.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
     (add the deployed URL too, e.g.
     `https://your-domain/api/auth/google/callback`)
4. Copy the client ID and client secret.

The redirect URI must match what the server sends byte for byte — a trailing
slash or `127.0.0.1` instead of `localhost` gives `redirect_uri_mismatch`.

## 2. Environment

Put these in `.env.local` (gitignored — never commit the secret):

```
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# already required by src/lib/session.js
JWT_SECRET=<a long random string>
```

If any of the three Google variables are missing, the button fails safely: the
user is redirected back to `/login?error=google_not_configured` instead of
hitting a 500.

## 3. Database

```sh
mysql -u <user> -p <database> < public/database/google_oauth.sql
```

`google_sub` holds Google's immutable per-user id, so matching on it keeps the
account stable even if the user later changes their Gmail address. `pwd` becomes
nullable because a Google-created account has no password.

## How an account is resolved

1. **Known `google_sub`** → sign that account in.
2. **Same email, no `google_sub`** → link Google to the existing password
   account. Safe because Google asserts `email_verified`, which the callback
   requires; a sign-in whose email is unverified is rejected.
3. **Neither** → create a passwordless account with the same `coin`/`streak`
   defaults as `/api/auth/register`.

## Branch note

This branch (`login`) holds only the login page. The callback imports
`@/lib/db` and `@/lib/session`, which live on `origin/api` — the flow runs once
the branches are merged, the same way `login/page.jsx` already imports
`@/lib/auth` and `@/components/*` from `origin/lib` and `origin/components`.
