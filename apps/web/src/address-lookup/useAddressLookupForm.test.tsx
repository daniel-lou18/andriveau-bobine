import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedRue } from "@andriveau-bobine/suggest";
import type { AddressLookup } from "../lookup/useAddressLookup";
import { useAddressLookupForm } from "./useAddressLookupForm";
import type { KeyboardEvent, SubmitEvent } from "react";

const resolvedRueDeLaPaix: ResolvedRue = {
  rueId: 42,
  display: "Rue de la Paix",
};

function createMockLookup(): AddressLookup & {
  submit: ReturnType<typeof vi.fn>;
} {
  return {
    result: null,
    loading: false,
    error: null,
    submit: vi.fn(),
    clear: vi.fn(),
  };
}

describe("useAddressLookupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps lookup fields disabled until a rue is resolved", () => {
    const lookup = createMockLookup();
    const { result } = renderHook(() =>
      useAddressLookupForm({ resolvedRue: null, lookup })
    );

    expect(result.current.lookupFieldsEnabled).toBe(false);
    expect(result.current.canSubmit).toBe(false);
  });

  it("enables lookup fields after a rue is resolved but requires a positive number", () => {
    const lookup = createMockLookup();
    const { result, rerender } = renderHook(
      ({ resolvedRue }: { resolvedRue: ResolvedRue | null }) =>
        useAddressLookupForm({ resolvedRue, lookup }),
      { initialProps: { resolvedRue: null as ResolvedRue | null } }
    );

    rerender({ resolvedRue: resolvedRueDeLaPaix });

    expect(result.current.lookupFieldsEnabled).toBe(true);
    expect(result.current.canSubmit).toBe(false);

    act(() => {
      result.current.setN("95");
    });

    expect(result.current.canSubmit).toBe(true);
  });

  it("does not treat zero or non-integers as valid house numbers", () => {
    const lookup = createMockLookup();
    const { result } = renderHook(() =>
      useAddressLookupForm({ resolvedRue: resolvedRueDeLaPaix, lookup })
    );

    act(() => {
      result.current.setN("0");
    });
    expect(result.current.canSubmit).toBe(false);

    act(() => {
      result.current.setN("12.5");
    });
    expect(result.current.canSubmit).toBe(false);
  });

  it("submits lookup with rueId from the resolved rue on form submit", () => {
    const lookup = createMockLookup();
    const { result } = renderHook(() =>
      useAddressLookupForm({ resolvedRue: resolvedRueDeLaPaix, lookup })
    );

    act(() => {
      result.current.setN("95");
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleSubmit({
        preventDefault,
      } as unknown as SubmitEvent<HTMLFormElement>);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(lookup.submit).toHaveBeenCalledWith({
      rueId: 42,
      n: 95,
      suffix: undefined,
      provenance: undefined,
    });
  });

  it("submits lookup when Enter is pressed in the house number field", () => {
    const lookup = createMockLookup();
    const { result } = renderHook(() =>
      useAddressLookupForm({ resolvedRue: resolvedRueDeLaPaix, lookup })
    );

    act(() => {
      result.current.setN("95");
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleNumberKeyDown({
        key: "Enter",
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(lookup.submit).toHaveBeenCalledWith({
      rueId: 42,
      n: 95,
      suffix: undefined,
      provenance: undefined,
    });
  });

  it("does not submit when the form is invalid", () => {
    const lookup = createMockLookup();
    const { result } = renderHook(() =>
      useAddressLookupForm({ resolvedRue: null, lookup })
    );

    act(() => {
      result.current.setN("95");
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleSubmit({
        preventDefault,
      } as unknown as SubmitEvent<HTMLFormElement>);
    });

    expect(lookup.submit).not.toHaveBeenCalled();
  });

  it("ignores non-Enter keys in the house number field", () => {
    const lookup = createMockLookup();
    const { result } = renderHook(() =>
      useAddressLookupForm({ resolvedRue: resolvedRueDeLaPaix, lookup })
    );

    act(() => {
      result.current.setN("95");
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleNumberKeyDown({
        key: "Tab",
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(lookup.submit).not.toHaveBeenCalled();
  });

  it("maps suffix select values and includes provenance when checked", () => {
    const lookup = createMockLookup();
    const { result } = renderHook(() =>
      useAddressLookupForm({ resolvedRue: resolvedRueDeLaPaix, lookup })
    );

    expect(result.current.suffixSelectValue).toBe("none");

    act(() => {
      result.current.setN("8");
      result.current.setSuffixFromSelect("bis");
      result.current.setProvenance(true);
    });

    expect(result.current.suffixSelectValue).toBe("bis");

    const preventDefault = vi.fn();
    act(() => {
      result.current.handleSubmit({
        preventDefault,
      } as unknown as SubmitEvent<HTMLFormElement>);
    });

    expect(lookup.submit).toHaveBeenCalledWith({
      rueId: 42,
      n: 8,
      suffix: "bis",
      provenance: true,
    });
  });

  it("clears suffix when the select value is none", () => {
    const lookup = createMockLookup();
    const { result } = renderHook(() =>
      useAddressLookupForm({ resolvedRue: resolvedRueDeLaPaix, lookup })
    );

    act(() => {
      result.current.setN("8");
      result.current.setSuffixFromSelect("bis");
    });
    act(() => {
      result.current.setSuffixFromSelect("none");
    });

    expect(result.current.suffixSelectValue).toBe("none");

    act(() => {
      result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as SubmitEvent<HTMLFormElement>);
    });

    expect(lookup.submit).toHaveBeenCalledWith({
      rueId: 42,
      n: 8,
      suffix: undefined,
      provenance: undefined,
    });
  });
});
