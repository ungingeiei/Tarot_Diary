/**
 * Server component. Its only job is to read the query string that
 * /api/auth/google/callback redirects back with and pass it into the
 * client form — which keeps the form itself server-rendered instead of
 * hiding it behind a <Suspense> boundary (what useSearchParams() inside
 * a client page would require).
 */

import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  return (
    <LoginForm
      googleStatus={params?.google ?? ""}
      googleErrorCode={params?.error ?? ""}
    />
  );
}
