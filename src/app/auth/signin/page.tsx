"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Kunne ikke starte innloggingen. Prøv igjen.",
  OAuthCallback: "Kunne ikke fullføre innloggingen. Prøv igjen.",
  AccessDenied: "Du har ikke tilgang med denne e‑postadressen.",
  Configuration: "Feil i serverkonfigurasjon.",
};

function SignInContent() {
  const params = useSearchParams();
  const error = params.get("error");
  const message = error ? ERROR_MESSAGES[error] ?? "Innlogging feilet." : null;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm text-center space-y-4">
        <h1 className="text-2xl font-semibold text-primary">Logg inn</h1>
        <p className="text-sm text-muted-foreground">
          Du må logge inn med Google for å bruke rapportverktøyet.
        </p>
        {message && (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
            {message}
          </div>
        )}
        <Button onClick={() => signIn("google", { callbackUrl: "/" })} className="w-full">
          Logg inn med Google
        </Button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
