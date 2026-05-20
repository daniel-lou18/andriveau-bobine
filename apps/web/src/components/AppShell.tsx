import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

export type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:py-12">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Andriveau-Bobine
          </h1>
          <p className="text-sm text-muted-foreground">
            Recherche d&apos;adresse dans les registres parisiens des bobines.
          </p>
        </header>
        <Separator />
        <main className="flex flex-col gap-8">{children}</main>
      </div>
    </div>
  );
}
