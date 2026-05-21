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
import type { RueSuggestion } from "@andriveau-bobine/suggest";
import { fetchRueSuggestions } from "./api";
import { RueSuggestBox } from "./RueSuggestBox";
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

function RueSuggestHarness({
  numberInputId = "lookup-number-input",
}: {
  numberInputId?: string;
}) {
  const disambiguation = useRueDisambiguation();
  return (
    <>
      <RueSuggestBox
        disambiguation={disambiguation}
        numberInputId={numberInputId}
      />
      <input id={numberInputId} data-testid="lookup-number-input" />
    </>
  );
}

async function advanceDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(150);
  });
}

afterEach(() => {
  cleanup();
});

describe("RueSuggestBox", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a French label and placeholder", () => {
    render(<RueSuggestHarness />, { wrapper: createWrapper() });

    expect(screen.getByLabelText("Rue")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Saisir au moins 2 caractères…")
    ).toBeTruthy();
  });

  it("shows French-labelled suggestions after debounced typing", async () => {
    mockFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });

    render(<RueSuggestHarness />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText("Rue"), {
      target: { value: "pa" },
    });
    await advanceDebounce();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Rue de la Paix" })).toBeTruthy();
    });
  });

  it("selects a suggestion, closes the list, and hides internal identifiers", async () => {
    mockFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });

    render(<RueSuggestHarness />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText("Rue"), {
      target: { value: "pa" },
    });
    await advanceDebounce();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Rue de la Paix" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("option", { name: "Rue de la Paix" }));

    await waitFor(() => {
      expect(screen.queryByRole("option")).toBeNull();
    });
    expect((screen.getByLabelText("Rue") as HTMLInputElement).value).toBe(
      "Rue de la Paix"
    );
    expect(screen.queryByText(/rue_id/i)).toBeNull();
  });

  it("focuses the house number input after selecting a suggestion", async () => {
    mockFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });

    render(<RueSuggestHarness />, { wrapper: createWrapper() });

    const numberInput = screen.getByTestId("lookup-number-input");
    fireEvent.change(screen.getByLabelText("Rue"), {
      target: { value: "pa" },
    });
    await advanceDebounce();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Rue de la Paix" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("option", { name: "Rue de la Paix" }));

    await waitFor(() => {
      expect(document.activeElement).toBe(numberInput);
    });
  });

  it("clears the field and disambiguation state via the clear control", async () => {
    mockFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });

    render(<RueSuggestHarness />, { wrapper: createWrapper() });

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

    fireEvent.click(screen.getByRole("button", { name: "Effacer la rue" }));

    expect((screen.getByLabelText("Rue") as HTMLInputElement).value).toBe("");
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("re-enables suggest when the user edits the resolved value", async () => {
    mockFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });

    render(<RueSuggestHarness />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText("Rue"), {
      target: { value: "pa" },
    });
    await advanceDebounce();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Rue de la Paix" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("option", { name: "Rue de la Paix" }));
    await waitFor(() => {
      expect(screen.queryByRole("option")).toBeNull();
    });

    fireEvent.change(screen.getByLabelText("Rue"), {
      target: { value: "Rue de la Paixx" },
    });
    await advanceDebounce();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Rue de la Paix" })).toBeTruthy();
    });
  });

  it("selects the highlighted option when Enter is pressed in the open list", async () => {
    mockFetch.mockResolvedValue({ ok: true, results: [rueDeLaPaix] });

    render(<RueSuggestHarness />, { wrapper: createWrapper() });

    const input = screen.getByLabelText("Rue");
    fireEvent.change(input, { target: { value: "pa" } });
    await advanceDebounce();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Rue de la Paix" })).toBeTruthy();
    });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe("Rue de la Paix");
      expect(screen.queryByRole("option")).toBeNull();
    });
  });
});
