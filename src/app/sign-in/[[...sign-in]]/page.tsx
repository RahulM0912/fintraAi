import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-zinc-950">
      <Suspense>
        <AuthForm mode="sign-in" />
      </Suspense>
    </div>
  );
}
