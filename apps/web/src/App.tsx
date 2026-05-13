import { useState } from "react";
import { RueSuggestBox, type SelectedRue } from "./rue-suggest/RueSuggestBox";

function App() {
  const [chosen, setChosen] = useState<SelectedRue | null>(null);
  return (
    <div className="app">
      <h1>Andriveau-Bobine</h1>
      <p>Rue suggest (autocomplete) — v1 read API slice.</p>
      <RueSuggestBox onSelect={setChosen} />
      {chosen && (
        <p>
          Latest selection from the app:{" "}
          <strong>{chosen.display}</strong> (rue_id <code>{chosen.rueId}</code>)
        </p>
      )}
    </div>
  );
}

export default App;
