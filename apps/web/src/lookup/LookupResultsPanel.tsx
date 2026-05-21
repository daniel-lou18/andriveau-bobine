import type { LookupResponse } from "@andriveau-bobine/lookup";
import { lookupProvenanceKey, lookupTripleKey } from "@andriveau-bobine/lookup";
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

export function LookupResultsPanel({
  result,
  loading,
  error,
}: LookupResultsPanelProps) {
  if (loading) {
    return (
      <div
        data-testid="lookup-results-loading"
        aria-busy="true"
        aria-label="Recherche en cours…"
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="lookup-error" role="alert">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (result === null) {
    return (
      <Empty data-testid="lookup-results-idle">
        <EmptyHeader>
          <EmptyTitle>Résultats</EmptyTitle>
          <EmptyDescription>
            Choisissez une rue et un numéro, puis lancez la recherche.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (result.matches.length === 0) {
    return (
      <Empty data-testid="lookup-no-result">
        <EmptyHeader>
          <EmptyTitle>Aucun résultat</EmptyTitle>
          <EmptyDescription>
            Aucun segment des bobines ne couvre cette adresse sur la rue
            choisie.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div data-testid="lookup-result" className="flex flex-col gap-4">
      {result.conflict ? (
        <Alert data-testid="lookup-conflict-banner" role="alert">
          <AlertTitle>Conflit</AlertTitle>
          <AlertDescription>
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
  );
}
