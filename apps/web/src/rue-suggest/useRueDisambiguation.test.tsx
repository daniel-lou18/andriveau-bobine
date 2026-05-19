import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RueSuggestion } from "@andriveau-bobine/suggest";
import { fetchRueSuggestions } from "./api";
import { useRueDisambiguation } from "./useRueDisambiguation";

vi.mock("./api", () => ({
  fetchRueSuggestions: vi.fn(),
}));

const mockFetch = vi.mocked(fetchRueSuggestions);

const rueDeLaPaix: RueSuggestion = {
  rue_id: 42,
  type: "Rue",
  libelle: "de la Paix",
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

/** Debounce (150ms) then let React Query settle. */
async function advanceDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(150);
  });
}

describe("useRueDisambiguation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fetch when the query is shorter than the API minimum", async () => {
    const { result } = renderHook(() => useRueDisambiguation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery("a");
    });
    await advanceDebounce();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("debounces input then loads suggestions", async () => {
    mockFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });

    const { result } = renderHook(() => useRueDisambiguation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery("pa");
    });
    expect(mockFetch).not.toHaveBeenCalled();

    await advanceDebounce();

    await waitFor(() => {
      expect(result.current.suggestions).toEqual([rueDeLaPaix]);
    });
    expect(mockFetch).toHaveBeenCalledWith("pa", expect.any(AbortSignal));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("surfaces API errors from the suggest query", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      error: "Server error",
    });

    const { result } = renderHook(() => useRueDisambiguation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery("pa");
    });
    await advanceDebounce();

    await waitFor(() => {
      expect(result.current.error).toBe("Server error");
    });
    expect(result.current.suggestions).toEqual([]);
  });

  it("resolves a suggestion and suppresses further suggest UI", async () => {
    mockFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });
    const onResolved = vi.fn();

    const { result } = renderHook(
      () => useRueDisambiguation({ onResolved }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.setQuery("pa");
    });
    await advanceDebounce();
    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    act(() => {
      result.current.selectSuggestion(rueDeLaPaix);
    });

    expect(result.current.resolvedRue).toEqual({
      rueId: 42,
      display: "Rue de la Paix",
    });
    expect(result.current.query).toBe("Rue de la Paix");
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.canSubmitLookup).toBe(true);
    expect(onResolved).toHaveBeenCalledWith({
      rueId: 42,
      display: "Rue de la Paix",
    });

    const callsAfterSelect = mockFetch.mock.calls.length;
    await advanceDebounce();
    expect(mockFetch.mock.calls.length).toBe(callsAfterSelect);
  });

  it("clears resolution when the user edits the query", async () => {
    mockFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });

    const { result } = renderHook(() => useRueDisambiguation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery("pa");
    });
    await advanceDebounce();
    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    act(() => {
      result.current.selectSuggestion(rueDeLaPaix);
    });
    expect(result.current.canSubmitLookup).toBe(true);

    act(() => {
      result.current.setQuery("Rue de la Paixx");
    });

    expect(result.current.resolvedRue).toBeNull();
    expect(result.current.canSubmitLookup).toBe(false);
  });

  it("clearResolved re-enables suggest when the query is still long enough", async () => {
    mockFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });

    const { result } = renderHook(() => useRueDisambiguation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery("pa");
    });
    await advanceDebounce();
    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    act(() => {
      result.current.selectSuggestion(rueDeLaPaix);
    });
    expect(result.current.suggestions).toEqual([]);

    act(() => {
      result.current.clearResolved();
    });

    await waitFor(() => {
      expect(result.current.suggestions).toEqual([rueDeLaPaix]);
    });
    expect(result.current.canSubmitLookup).toBe(false);
  });
});
