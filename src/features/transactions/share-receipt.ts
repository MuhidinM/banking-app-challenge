/**
 * Shares a receipt's text (N-014): the system share sheet where the browser
 * has one (phones, Safari, Edge), otherwise the clipboard.
 *
 * Returns what happened, so the caller can confirm it: "shared" (or the user
 * closed the share sheet, which needs no message), "copied", or "failed".
 */
export async function shareReceipt(
  title: string,
  text: string,
): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator.share === "function" && navigator.canShare?.({ title, text }) !== false) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (error) {
      // Closing the share sheet isn't a failure.
      if (error instanceof DOMException && error.name === "AbortError") return "shared";
      // Anything else (not allowed here, say): fall back to the clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
