/**
 * Server component wrapper for the login screen.
 *
 * It exists only to read `?google=success` / `?error=<code>` off the URL
 * — the two things /api/auth/google/callback can send the browser back
 * with — and hand them to <LoginForm> as props. Reading them inside the
 * client form with useSearchParams() would force the whole panel under a
 * <Suspense> boundary and strip it out of the prerendered HTML.
 */

import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;

  return (
    <LoginForm
      googleStatus={params?.google || ""}
      googleErrorCode={params?.error || ""}
    />
  );
}
