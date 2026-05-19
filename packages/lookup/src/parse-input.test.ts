import { describe, expect, it } from "vitest";
import { parseLookupInput } from "./parse-input";

describe("parseLookupInput", () => {
  it("defaults n_rank to 0 when suffix is omitted", () => {
    expect(parseLookupInput(42).n_rank).toBe(0);
  });

  it("maps canonical suffix tokens to n_rank", () => {
    expect(parseLookupInput(8, "bis").n_rank).toBe(1);
    expect(parseLookupInput(8, "ter").n_rank).toBe(2);
    expect(parseLookupInput(8, "septies").n_rank).toBe(6);
  });

  it("infers odd parity for odd house numbers", () => {
    expect(parseLookupInput(95).parity).toBe("odd");
    expect(parseLookupInput(1).parity).toBe("odd");
  });

  it("infers even parity for even house numbers", () => {
    expect(parseLookupInput(14).parity).toBe("even");
    expect(parseLookupInput(2).parity).toBe("even");
  });

  it("does not change parity when a suffix is present (8bis is even)", () => {
    expect(parseLookupInput(8, "bis").parity).toBe("even");
  });
});
