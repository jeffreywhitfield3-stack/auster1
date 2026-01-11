"use client";

import { Container, Card, Button } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function ProjectsClient() {
  const router = useRouter();
  const sp = useSearchParams();

  // Example: if you want to support /app/projects?next=/something
  const next = useMemo(() => sp.get("next") || "", [sp]);

  return (
      <main className="pb-20 pt-10">
        <Container>
          <Card className="p-6">
            <div className="text-xl font-semibold text-zinc-900">Projects</div>
            <div className="mt-2 text-sm text-zinc-600">
              This page is now correctly wrapped in Suspense, so useSearchParams won’t break your build anymore.
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => router.push("/products/derivatives")}>
                Go to Derivatives Lab
              </Button>
              {next ? (
                <Button variant="primary" onClick={() => router.push(next)}>
                  Continue
                </Button>
              ) : null}
            </div>
          </Card>
        </Container>
      </main>
  );
}