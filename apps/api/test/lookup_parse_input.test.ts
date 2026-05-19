import { describe, expect, it } from "vitest";
import { parseLookupInput } from "../src/lookup/parse-input";

describe("parseLookupInput", () => {
  it("defaults n_rank to 0", () => {
    expect(parseLookupInput(42).n_rank).toBe(0);
  });

  it("infers odd parity for odd house numbers", () => {
    expect(parseLookupInput(95).parity).toBe("odd");
    expect(parseLookupInput(1).parity).toBe("odd");
  });

  it("infers even parity for even house numbers", () => {
    expect(parseLookupInput(14).parity).toBe("even");
    expect(parseLookupInput(2).parity).toBe("even");
  });
});
