import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LookupResultBox } from "./LookupResultBox";

afterEach(() => {
  cleanup();
});

describe("LookupResultBox", () => {
  it("does not render a conflict badge when conflict is false", () => {
    render(
      <LookupResultBox
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

    expect(screen.queryByTestId("lookup-conflict-badge")).toBeNull();
    expect(screen.getByTestId("lookup-matches")).toBeTruthy();
  });

  it("renders a conflict badge alongside matches when conflict is true", () => {
    render(
      <LookupResultBox
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

    expect(screen.getByTestId("lookup-conflict-badge").textContent).toMatch(
      /sources disagree/i
    );
    expect(screen.getByTestId("lookup-matches")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders expandable provenance when present on a match", () => {
    render(
      <LookupResultBox
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

    expect(screen.getByTestId("lookup-provenance")).toBeTruthy();
    expect(screen.getByText(/Bobine 8, page 2/)).toBeTruthy();
    expect(screen.getByText(/Ilot 4121 \| rue de Test \| 95/)).toBeTruthy();
  });

  it("does not render provenance UI when provenance is absent", () => {
    render(
      <LookupResultBox
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
