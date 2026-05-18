import { RueSuggestBox, rueIdForLookup, useRueDisambiguation } from "./rue-suggest";

function App() {
  const disambiguation = useRueDisambiguation();

  return (
    <div className="app">
      <h1>Andriveau-Bobine</h1>
      <p>Rue suggest (autocomplete) — v1 read API slice.</p>

      <RueSuggestBox disambiguation={disambiguation} />

      <section aria-label="Lookup handoff (demo)">
        <button
          type="button"
          disabled={!disambiguation.canSubmitLookup}
          data-testid="lookup-submit-demo"
        >
          Submit lookup
        </button>
        {disambiguation.canSubmitLookup && disambiguation.resolvedRue && (
          <p data-testid="lookup-ready">
            Lookup will use{" "}
            <code>rue_id={rueIdForLookup(disambiguation.resolvedRue)}</code>{" "}
            (not the display string).
          </p>
        )}
      </section>
    </div>
  );
}

export default App;
