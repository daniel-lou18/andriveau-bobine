import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LookupResultsPanel } from "./LookupResultsPanel";

afterEach(() => {
  cleanup();
});

describe("LookupResultsPanel", () => {
  it("shows French idle guidance before any lookup", () => {
    render(<LookupResultsPanel loading={false} error={null} result={null} />);

    expect(
      screen.queryByRole("heading", { level: 3, name: "Résultats" })
    ).toBeNull();
    expect(
      screen.getByText(
        "Choisissez une rue et un numéro, puis lancez la recherche."
      )
    ).toBeTruthy();
    expect(screen.getByTestId("lookup-results-idle")).toBeTruthy();
  });

  it("shows skeleton placeholders while loading", () => {
    render(<LookupResultsPanel loading={true} error={null} result={null} />);

    expect(screen.getByTestId("lookup-results-loading")).toBeTruthy();
    expect(screen.queryByTestId("lookup-results-idle")).toBeNull();
  });

  it("shows a French error alert", () => {
    render(
      <LookupResultsPanel
        loading={false}
        error="Rue introuvable."
        result={null}
      />
    );

    expect(screen.getByRole("alert").textContent).toContain("Rue introuvable.");
    expect(screen.getByTestId("lookup-error")).toBeTruthy();
  });

  it("shows French no-match copy when matches are empty", () => {
    render(
      <LookupResultsPanel
        loading={false}
        error={null}
        result={{ conflict: false, matches: [] }}
      />
    );

    expect(
      screen.getByText(
        "Aucun segment des bobines ne couvre cette adresse sur la rue choisie."
      )
    ).toBeTruthy();
    expect(screen.getByTestId("lookup-no-result")).toBeTruthy();
  });

  it("does not render a conflict banner when conflict is false", () => {
    render(
      <LookupResultsPanel
        loading={false}
        error={null}
        result={{
          conflict: false,
          matches: [
            {
              arrondissement: 6,
              quartier: "Notre-Dame-des-Champs",
              ilot: 4121,
            },
          ],
        }}
      />
    );

    expect(screen.queryByTestId("lookup-conflict-banner")).toBeNull();
    expect(screen.getByTestId("lookup-matches")).toBeTruthy();
  });

  it("renders a French conflict alert alongside matches when conflict is true", () => {
    render(
      <LookupResultsPanel
        loading={false}
        error={null}
        result={{
          conflict: true,
          matches: [
            {
              arrondissement: 6,
              quartier: "Notre-Dame-des-Champs",
              ilot: 4121,
            },
            {
              arrondissement: 6,
              quartier: "Notre-Dame-des-Champs",
              ilot: 4999,
            },
          ],
        }}
      />
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Résultats (2)" })
    ).toBeTruthy();
    expect(screen.getByTestId("lookup-conflict-banner")).toBeTruthy();
    expect(screen.getByText("Conflit")).toBeTruthy();
    expect(
      screen.getByText(/plusieurs bobines ne concordent pas sur l.îlot/i)
    ).toBeTruthy();
    expect(screen.getAllByTestId("lookup-match-card")).toHaveLength(2);
  });

  it("renders match cards with French îlot primary and location secondary", () => {
    render(
      <LookupResultsPanel
        loading={false}
        error={null}
        result={{
          conflict: false,
          matches: [
            {
              arrondissement: 6,
              quartier: "Notre-Dame-des-Champs",
              ilot: 4121,
            },
          ],
        }}
      />
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Résultats (1)" })
    ).toBeTruthy();
    expect(screen.getByText("Îlot 4121")).toBeTruthy();
    expect(
      screen.getByText("6ᵉ arrondissement — Notre-Dame-des-Champs")
    ).toBeTruthy();
  });

  it("renders expandable French provenance when present on a match", () => {
    render(
      <LookupResultsPanel
        loading={false}
        error={null}
        result={{
          conflict: false,
          matches: [
            {
              arrondissement: 6,
              quartier: "Notre-Dame-des-Champs",
              ilot: 4121,
              provenance: [
                {
                  bobine: 8,
                  page: 2,
                  sequence: 1,
                  raw_text: "Ilot 4121 | rue de Test | 95",
                },
              ],
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Provenance (1)")).toBeTruthy();
    fireEvent.click(screen.getByText("Provenance (1)"));
    expect(screen.getByText(/Bobine 8, page 2, seq\. 1/)).toBeTruthy();
    expect(screen.getByText(/Ilot 4121 \| rue de Test \| 95/)).toBeTruthy();
  });

  it("does not render provenance UI when provenance is absent", () => {
    render(
      <LookupResultsPanel
        loading={false}
        error={null}
        result={{
          conflict: false,
          matches: [
            {
              arrondissement: 6,
              quartier: "Notre-Dame-des-Champs",
              ilot: 4121,
            },
          ],
        }}
      />
    );

    expect(screen.queryByTestId("lookup-provenance")).toBeNull();
  });
});
