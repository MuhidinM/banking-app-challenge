import { ThemeToggle } from "@/shared/theme/theme-toggle";

// Placeholder until the dashboard is built (#29). The theme switch lives here for
// now so it can be tried; it moves to the sidebar (#26) and profile (#44).
export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-content flex-col gap-section p-page">
      <h1 className="type-title">Kifiya Banking</h1>
      <ThemeToggle />
    </main>
  );
}
