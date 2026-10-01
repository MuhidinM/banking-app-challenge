/** "Good morning" before noon, "Good afternoon" until 5 pm, then "Good evening" (local time). */
export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
