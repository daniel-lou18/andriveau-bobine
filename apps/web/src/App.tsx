import { AppShell } from "@/components/AppShell";
import { LookupForm, LookupResultBox, useAddressLookup } from "./lookup";
import { RueSuggestBox, useRueDisambiguation } from "./rue-suggest";

function App() {
  const disambiguation = useRueDisambiguation();
  const lookup = useAddressLookup();

  return (
    <AppShell>
      <RueSuggestBox disambiguation={disambiguation} />

      <section aria-label="Recherche d'adresse" className="flex flex-col gap-6">
        <LookupForm resolvedRue={disambiguation.resolvedRue} lookup={lookup} />
        <LookupResultBox
          result={lookup.result}
          loading={lookup.loading}
          error={lookup.error}
        />
      </section>
    </AppShell>
  );
}

export default App;
