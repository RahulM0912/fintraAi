import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-12">
      <Suspense>
        <AuthForm mode="sign-in" />
      </Suspense>
    </div>
  );
}
