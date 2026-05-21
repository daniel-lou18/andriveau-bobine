import { AddressLookupPanel } from "@/address-lookup";
import { AppShell } from "@/components/AppShell";
import { LookupResultBox, useAddressLookup } from "./lookup";
import { useRueDisambiguation } from "./rue-suggest";

function App() {
  const disambiguation = useRueDisambiguation();
  const lookup = useAddressLookup();

  return (
    <AppShell>
      <section aria-label="Recherche d'adresse" className="flex flex-col gap-6">
        <AddressLookupPanel
          disambiguation={disambiguation}
          lookup={lookup}
        />
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
