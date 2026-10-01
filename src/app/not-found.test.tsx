import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "./not-found";

describe("root not-found page", () => {
  it("shows the logo, the message and a link home", () => {
    render(<NotFound />);

    expect(screen.getByRole("img", { name: "Kifiya" })).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute("href", "/");
  });
});
