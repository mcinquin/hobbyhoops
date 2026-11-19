import { connection } from "next/server";
import { LoginForm } from "@/components/login-form";
import { countUsers } from "@/lib/users-store";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  // better-sqlite3 is synchronous: make sure the user count is read per request.
  await connection();
  const needsBootstrap = countUsers() === 0;
  const { from } = await searchParams;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 border border-border rounded-xl p-8 bg-card shadow-sm">
        <LoginForm
          needsBootstrap={needsBootstrap}
          fromPath={typeof from === "string" ? from : null}
        />
      </div>
    </div>
  );
}
