import { LookupForm, LookupResultBox, useAddressLookup } from "./lookup";
import { RueSuggestBox, useRueDisambiguation } from "./rue-suggest";

function App() {
  const disambiguation = useRueDisambiguation();
  const lookup = useAddressLookup();

  return (
    <div className="app">
      <h1>Andriveau-Bobine</h1>
      <p>Rue suggest + number-bearing lookup — v1 read API slice.</p>

      <RueSuggestBox disambiguation={disambiguation} />

      <section aria-label="Address lookup">
        <LookupForm resolvedRue={disambiguation.resolvedRue} lookup={lookup} />
        <LookupResultBox lookup={lookup} />
      </section>
    </div>
  );
}

export default App;
