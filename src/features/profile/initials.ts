/** "JD" for Jane Doe (UI spec: first letters of first and last name). */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toLocaleUpperCase();
}
