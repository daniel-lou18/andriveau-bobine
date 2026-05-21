import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LookupResponse } from "@andriveau-bobine/lookup";
import type { RueSuggestion } from "@andriveau-bobine/suggest";
import { fetchLookup } from "../lookup/api";
import { useAddressLookup } from "../lookup/useAddressLookup";
import { fetchRueSuggestions } from "../rue-suggest/api";
import { useRueDisambiguation } from "../rue-suggest/useRueDisambiguation";
import { AddressLookupPanel } from "./AddressLookupPanel";

vi.mock("../rue-suggest/api", () => ({
  fetchRueSuggestions: vi.fn(),
}));

vi.mock("../lookup/api", () => ({
  fetchLookup: vi.fn(),
}));

const mockSuggestFetch = vi.mocked(fetchRueSuggestions);
const mockLookupFetch = vi.mocked(fetchLookup);

const rueDeLaPaix: RueSuggestion = {
  rue_id: 42,
  type: "Rue",
  libelle: "de la Paix",
};

const sampleResponse: LookupResponse = {
  conflict: false,
  matches: [
    {
      arrondissement: 6,
      quartier: "Notre-Dame-des-Champs",
      ilot: 4121,
    },
  ],
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });
}

function createWrapper(queryClient = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function AddressLookupHarness() {
  const disambiguation = useRueDisambiguation();
  const lookup = useAddressLookup();
  return <AddressLookupPanel disambiguation={disambiguation} lookup={lookup} />;
}

async function advanceDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(150);
  });
}

async function resolveRue() {
  fireEvent.change(screen.getByLabelText("Rue"), {
    target: { value: "pa" },
  });
  await advanceDebounce();

  await waitFor(() => {
    expect(screen.getByRole("option", { name: "Rue de la Paix" })).toBeTruthy();
  });

  fireEvent.click(screen.getByRole("option", { name: "Rue de la Paix" }));

  await waitFor(() => {
    expect((screen.getByLabelText("Rue") as HTMLInputElement).value).toBe(
      "Rue de la Paix"
    );
  });
}

afterEach(() => {
  cleanup();
});

describe("AddressLookupPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockSuggestFetch.mockReset();
    mockLookupFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a unified search card with French labels", () => {
    render(<AddressLookupHarness />, { wrapper: createWrapper() });

    expect(screen.getByTestId("address-lookup-panel")).toBeTruthy();
    expect(screen.getByLabelText("Rue")).toBeTruthy();
    expect(screen.getByLabelText("Numéro")).toBeTruthy();
    expect(screen.getByLabelText("Suffixe")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rechercher" })).toBeTruthy();
    expect(
      screen.getByLabelText("Inclure la provenance des registres")
    ).toBeTruthy();
  });

  it("keeps Numéro, Suffixe, and Rechercher disabled until a rue is resolved", async () => {
    mockSuggestFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });

    render(<AddressLookupHarness />, { wrapper: createWrapper() });

    const numberInput = screen.getByLabelText("Numéro") as HTMLInputElement;
    const suffixTrigger = screen.getByLabelText("Suffixe");
    const submitButton = screen.getByRole("button", {
      name: "Rechercher",
    }) as HTMLButtonElement;
    const provenanceCheckbox = screen.getByLabelText(
      "Inclure la provenance des registres"
    ) as HTMLButtonElement;

    expect(numberInput.disabled).toBe(true);
    expect(suffixTrigger.hasAttribute("disabled")).toBe(true);
    expect(submitButton.disabled).toBe(true);
    expect(provenanceCheckbox.disabled).toBe(false);

    await resolveRue();

    expect(numberInput.disabled).toBe(false);
    expect(suffixTrigger.hasAttribute("disabled")).toBe(false);
    expect(submitButton.disabled).toBe(true);
  });

  it("submits lookup with rueId from the resolved rue only", async () => {
    mockSuggestFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });
    mockLookupFetch.mockResolvedValue({ ok: true, data: sampleResponse });

    render(<AddressLookupHarness />, { wrapper: createWrapper() });

    await resolveRue();

    fireEvent.change(screen.getByLabelText("Numéro"), {
      target: { value: "95" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    await waitFor(() => {
      expect(mockLookupFetch).toHaveBeenCalledWith(
        42,
        95,
        undefined,
        false,
        expect.any(AbortSignal)
      );
    });
  });

  it("submits lookup when Enter is pressed in the house number field", async () => {
    mockSuggestFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });
    mockLookupFetch.mockResolvedValue({ ok: true, data: sampleResponse });

    render(<AddressLookupHarness />, { wrapper: createWrapper() });

    await resolveRue();

    const numberInput = screen.getByLabelText("Numéro");
    fireEvent.change(numberInput, { target: { value: "95" } });
    fireEvent.keyDown(numberInput, { key: "Enter" });

    await waitFor(() => {
      expect(mockLookupFetch).toHaveBeenCalledWith(
        42,
        95,
        undefined,
        false,
        expect.any(AbortSignal)
      );
    });
  });

  it("passes provenance=1 when the provenance checkbox is checked", async () => {
    mockSuggestFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });
    mockLookupFetch.mockResolvedValue({ ok: true, data: sampleResponse });

    render(<AddressLookupHarness />, { wrapper: createWrapper() });

    await resolveRue();

    fireEvent.change(screen.getByLabelText("Numéro"), {
      target: { value: "95" },
    });
    fireEvent.click(
      screen.getByLabelText("Inclure la provenance des registres")
    );
    fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    await waitFor(() => {
      expect(mockLookupFetch).toHaveBeenCalledWith(
        42,
        95,
        undefined,
        true,
        expect.any(AbortSignal)
      );
    });
  });
});
