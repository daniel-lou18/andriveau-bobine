import type { AddressLookup } from "./useAddressLookup";

export type LookupResultBoxProps = {
  lookup: AddressLookup;
};

export function LookupResultBox({ lookup }: LookupResultBoxProps) {
  const { result, loading, error } = lookup;

  if (loading) {
    return <p role="status">Looking up…</p>;
  }

  if (error) {
    return (
      <p role="alert" data-testid="lookup-error">
        {error}
      </p>
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
          <li key={`${match.arrondissement}-${match.quartier}-${match.ilot}`}>
            {match.arrondissement}e — {match.quartier} — îlot {match.ilot}
            {match.provenance && match.provenance.length > 0 ? (
              <details data-testid="lookup-provenance">
                <summary>Provenance ({match.provenance.length})</summary>
                <ul>
                  {match.provenance.map((entry) => (
                    <li
                      key={`${entry.bobine}-${entry.page}-${entry.sequence}-${entry.raw_text}`}
                    >
                      Bobine {entry.bobine}, page {entry.page}
                      {entry.sequence !== null
                        ? `, seq ${entry.sequence}`
                        : ""}
                      : {entry.raw_text}
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
