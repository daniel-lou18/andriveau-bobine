import type { ReactNode } from "react";
import type { LookupResponse } from "@andriveau-bobine/lookup";
import { lookupProvenanceKey, lookupTripleKey } from "@andriveau-bobine/lookup";
import { CircleAlert, MapPin, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatLookupIlotFr,
  formatLookupLocationFr,
  formatLookupProvenanceFr,
} from "@/lib/formatLookupFr";

export type LookupResultsPanelProps = {
  result: LookupResponse | null;
  loading: boolean;
  error: string | null;
};

function resultsHeadingLabel(matchCount: number): string {
  return `Résultats (${matchCount})`;
}

function ResultsSection({
  matchCount,
  children,
}: {
  matchCount: number;
  children: ReactNode;
}) {
  const heading = resultsHeadingLabel(matchCount);
  const hasHeading = matchCount > 0;
  return (
    <section
      aria-label={hasHeading ? undefined : "Résultats"}
      aria-labelledby={hasHeading ? "lookup-results-heading" : undefined}
      className="flex flex-col gap-4"
      data-testid="lookup-results-section"
    >
      {hasHeading ? (
        <h3
          id="lookup-results-heading"
          className="font-sans text-sm font-medium text-primary"
        >
          {heading}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

export function LookupResultsPanel({
  result,
  loading,
  error,
}: LookupResultsPanelProps) {
  const matchCount = result?.matches.length ?? 0;

  if (loading) {
    return (
      <ResultsSection matchCount={0}>
        <div
          data-testid="lookup-results-loading"
          aria-busy="true"
          aria-label="Recherche en cours…"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </ResultsSection>
    );
  }

  if (error) {
    return (
      <ResultsSection matchCount={0}>
        <Alert
          variant="destructive"
          data-testid="lookup-error"
          role="alert"
          className="grid-cols-[auto_1fr] items-start gap-x-3 border-destructive/25 bg-destructive/[0.07]"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/12 text-destructive"
            aria-hidden="true"
          >
            <CircleAlert className="size-4" strokeWidth={2.25} />
          </span>
          <AlertDescription className="col-start-2 text-destructive/90">
            {error}
          </AlertDescription>
        </Alert>
      </ResultsSection>
    );
  }

  if (result === null) {
    return (
      <ResultsSection matchCount={0}>
        <Empty data-testid="lookup-results-idle">
          <EmptyHeader>
            <EmptyMedia className="mb-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:pointer-events-none [&_svg]:size-5">
              <Search aria-hidden="true" />
            </EmptyMedia>
            <EmptyDescription>
              Choisissez une rue et un numéro, puis lancez la recherche.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </ResultsSection>
    );
  }

  if (result.matches.length === 0) {
    return (
      <ResultsSection matchCount={0}>
        <Empty data-testid="lookup-no-result">
          <EmptyHeader>
            <EmptyMedia className="mb-2 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:pointer-events-none [&_svg]:size-5">
              <MapPin aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="font-sans">Aucun résultat</EmptyTitle>
            <EmptyDescription>
              Aucun segment des bobines ne couvre cette adresse sur la rue
              choisie.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </ResultsSection>
    );
  }

  return (
    <ResultsSection matchCount={matchCount}>
      <div data-testid="lookup-result" className="flex flex-col gap-4">
        {result.conflict ? (
          <Alert
            data-testid="lookup-conflict-banner"
            role="alert"
            className="grid-cols-[auto_1fr] items-start gap-x-3 border-amber-600/20 bg-amber-500/[0.07]"
          >
            <span
              className="row-span-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-600/12 text-amber-800"
              aria-hidden="true"
            >
              <CircleAlert className="size-4" strokeWidth={2.25} />
            </span>
            <AlertTitle className="col-start-2">Conflit</AlertTitle>
            <AlertDescription className="col-start-2">
              Plusieurs bobines ne concordent pas sur l&apos;îlot pour cette
              adresse.
            </AlertDescription>
          </Alert>
        ) : null}
        <ul
          data-testid="lookup-matches"
          aria-label="Résultats de recherche"
          className="flex flex-col gap-3"
        >
          {result.matches.map((match) => (
            <li key={lookupTripleKey(match)}>
              <Card data-testid="lookup-match-card">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    {formatLookupIlotFr(match)}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {formatLookupLocationFr(match)}
                  </CardDescription>
                </CardHeader>
                {match.provenance && match.provenance.length > 0 ? (
                  <CardContent>
                    <Collapsible data-testid="lookup-provenance">
                      <CollapsibleTrigger className="text-sm font-medium underline-offset-4 hover:underline">
                        Provenance ({match.provenance.length})
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                          {match.provenance.map((entry) => (
                            <li key={lookupProvenanceKey(entry)}>
                              {formatLookupProvenanceFr(entry)}
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </ResultsSection>
  );
}
