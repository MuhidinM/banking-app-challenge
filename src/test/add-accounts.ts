import { newAccountNumber } from "@/mocks/db";
import { getDb } from "@/mocks/state";

/**
 * Gives a demo user extra accounts in the mock bank, e.g. more than one page
 * of them. Balances are in birr, as the API returns them.
 */
export function addAccounts(username: string, balances: number[]): void {
  const db = getDb();
  const user = db.users.find((candidate) => candidate.username === username);
  if (!user) throw new Error(`No mock user ${username}`);
  for (const balance of balances) {
    db.accounts.push({
      id: db.nextId.account++,
      accountNumber: newAccountNumber(db),
      balanceCents: Math.round(balance * 100),
      userId: user.id,
      accountType: "SAVINGS",
    });
  }
}
