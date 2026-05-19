import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AddressLookup } from "./useAddressLookup";
import { LookupResultBox } from "./LookupResultBox";

afterEach(() => {
  cleanup();
});

function lookupWith(overrides: Partial<AddressLookup>): AddressLookup {
  return {
    result: null,
    loading: false,
    error: null,
    submit: () => {},
    clear: () => {},
    ...overrides,
  };
}

describe("LookupResultBox", () => {
  it("does not render a conflict badge when conflict is false", () => {
    render(
      <LookupResultBox
        lookup={lookupWith({
          result: {
            conflict: false,
            matches: [
              {
                arrondissement: 6,
                quartier: "Notre-Dame-des-Champs",
                ilot: 4121,
              },
            ],
          },
        })}
      />
    );

    expect(screen.queryByTestId("lookup-conflict-badge")).toBeNull();
    expect(screen.getByTestId("lookup-matches")).toBeTruthy();
  });

  it("renders a conflict badge alongside matches when conflict is true", () => {
    render(
      <LookupResultBox
        lookup={lookupWith({
          result: {
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
          },
        })}
      />
    );

    expect(screen.getByTestId("lookup-conflict-badge").textContent).toMatch(
      /sources disagree/i
    );
    expect(screen.getByTestId("lookup-matches")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
