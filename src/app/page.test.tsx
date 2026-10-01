import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

// Smoke test proving the component-test setup works (jsdom, React plugin,
// jest-dom matchers). Replaced by dashboard tests when the page is built (#29).
describe("HomePage", () => {
  it("renders the page heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Kifiya Banking" })).toBeInTheDocument();
  });
});
