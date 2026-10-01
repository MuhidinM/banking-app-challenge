import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { THEME_STORAGE_KEY } from "./theme-preference";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "./use-theme";

const root = document.documentElement;

afterEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
});

/** jsdom has no matchMedia; this fakes the OS colour-scheme setting. */
function mockSystemTheme(initial: "light" | "dark") {
  let dark = initial === "dark";
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query.includes("dark") && dark;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    set(next: "light" | "dark") {
      dark = next === "dark";
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

function ResolvedTheme() {
  return <output aria-label="Showing">{useTheme().resolvedTheme}</output>;
}

describe("ThemeToggle", () => {
  it("offers System, Light and Dark as one labelled radio group", () => {
    render(<ThemeToggle />);
    const group = screen.getByRole("group", { name: "Theme" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual([
      "system",
      "light",
      "dark",
    ]);
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
  });

  it("applies and remembers the chosen theme", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(root.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "System" }));
    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("works with the keyboard: arrow keys move between options", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "System" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    expect(root.dataset.theme).toBe("light");
  });

  it("starts from the stored choice", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(<ThemeToggle />);
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
  });

  it("keeps accessible names in the icon-only variant", () => {
    render(<ThemeToggle variant="icons" />);
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument();
  });
});

describe("useTheme", () => {
  it('follows the OS while set to "system", and live OS changes', () => {
    const os = mockSystemTheme("light");
    render(<ResolvedTheme />);
    expect(screen.getByLabelText("Showing")).toHaveTextContent("light");

    os.set("dark");
    expect(screen.getByLabelText("Showing")).toHaveTextContent("dark");
  });

  it("ignores the OS once a theme is forced", async () => {
    const os = mockSystemTheme("dark");
    const user = userEvent.setup();
    render(
      <>
        <ThemeToggle />
        <ResolvedTheme />
      </>,
    );

    await user.click(screen.getByRole("radio", { name: "Light" }));
    os.set("dark");
    expect(screen.getByLabelText("Showing")).toHaveTextContent("light");
  });
});
