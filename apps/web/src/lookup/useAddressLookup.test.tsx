import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LookupResponse } from "@andriveau-bobine/lookup";
import { fetchLookup } from "./api";
import { useAddressLookup } from "./useAddressLookup";

vi.mock("./api", () => ({
  fetchLookup: vi.fn(),
}));

const mockFetch = vi.mocked(fetchLookup);

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

describe("useAddressLookup", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("does not fetch until submit is called", () => {
    const { result } = renderHook(() => useAddressLookup(), {
      wrapper: createWrapper(),
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("submit triggers fetch and exposes the lookup result", async () => {
    mockFetch.mockResolvedValue({ ok: true, data: sampleResponse });

    const { result } = renderHook(() => useAddressLookup(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.submit({ rueId: 42, n: 95 });
    });

    await waitFor(() => {
      expect(result.current.result).toEqual(sampleResponse);
    });
    expect(mockFetch).toHaveBeenCalledWith(42, 95, expect.any(AbortSignal));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("surfaces API errors from the lookup query", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      error: "rue not found",
    });

    const { result } = renderHook(() => useAddressLookup(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.submit({ rueId: 999, n: 10 });
    });

    await waitFor(() => {
      expect(result.current.error).toBe("rue not found");
    });
    expect(result.current.result).toBeNull();
  });

  it("clear resets submitted input and result state", async () => {
    mockFetch.mockResolvedValue({ ok: true, data: sampleResponse });

    const { result } = renderHook(() => useAddressLookup(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.submit({ rueId: 42, n: 95 });
    });
    await waitFor(() => {
      expect(result.current.result).toEqual(sampleResponse);
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("reuses the cache for identical re-submits", async () => {
    mockFetch.mockResolvedValue({ ok: true, data: sampleResponse });
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useAddressLookup(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.submit({ rueId: 42, n: 95 });
    });
    await waitFor(() => {
      expect(result.current.result).toEqual(sampleResponse);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.clear();
    });
    act(() => {
      result.current.submit({ rueId: 42, n: 95 });
    });

    await waitFor(() => {
      expect(result.current.result).toEqual(sampleResponse);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
