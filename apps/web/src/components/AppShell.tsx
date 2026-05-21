import type { ReactNode } from "react";
import { AppNavbar } from "@/components/AppNavbar";

export type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading uppercase text-lg font-semibold text-primary sm:text-2xl">
            Rechercher un numéro d&apos;îlot
          </h2>
          <div
            className="h-0.5 w-18 shrink-0 bg-brand-gold"
            aria-hidden="true"
          />
        </div>
        <main className="flex flex-col gap-8">{children}</main>
      </div>
    </div>
  );
}
