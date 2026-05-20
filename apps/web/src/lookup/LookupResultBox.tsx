import type { LookupResponse } from "@andriveau-bobine/lookup";
import {
  formatLookupProvenance,
  formatLookupTriple,
  lookupProvenanceKey,
  lookupTripleKey,
} from "@andriveau-bobine/lookup";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type LookupResultBoxProps = {
  result: LookupResponse | null;
  loading: boolean;
  error: string | null;
};

export function LookupResultBox({
  result,
  loading,
  error,
}: LookupResultBoxProps) {
  if (loading) {
    return <p role="status">Looking up…</p>;
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="lookup-error" role="alert">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (result === null) {
    return null;
  }

  if (result.matches.length === 0) {
    return (
      <p data-testid="lookup-no-result">
        No segment in the bobines covers this address on the selected rue.
      </p>
    );
  }

  return (
    <div data-testid="lookup-result">
      {result.conflict ? (
        <p
          data-testid="lookup-conflict-badge"
          role="status"
          title="Multiple bobine sources disagree on the îlot for this address (ADR-0003)."
        >
          Sources disagree
        </p>
      ) : null}
      <ul data-testid="lookup-matches" aria-label="Lookup results">
        {result.matches.map((match) => (
          <li key={lookupTripleKey(match)}>
            {formatLookupTriple(match)}
            {match.provenance && match.provenance.length > 0 ? (
              <details data-testid="lookup-provenance">
                <summary>Provenance ({match.provenance.length})</summary>
                <ul>
                  {match.provenance.map((entry) => (
                    <li key={lookupProvenanceKey(entry)}>
                      {formatLookupProvenance(entry)}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
