"use client";

import {
  ArrowLeftRight,
  CircleDollarSign,
  Hash,
  Landmark,
  Lock,
  Percent,
  ReceiptText,
  User,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { ThemeToggle } from "@/shared/theme/theme-toggle";
import { AmountField } from "@/shared/ui/amount-field";
import { Button } from "@/shared/ui/button";
import { RadioCards } from "@/shared/ui/radio-cards";
import { SelectField } from "@/shared/ui/select-field";
import { PasswordField, TextField } from "@/shared/ui/text-field";

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="type-heading text-ink">{title}</h2>
        <p className="type-body text-ink-muted">{note}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * The UI kit laid out like the spec's component sheet, for side-by-side checks
 * (and the fidelity report, #50). Development only; see src/app/dev/components.
 */
export function ComponentGallery() {
  const [amount, setAmount] = useState("250.00");
  const [billAmount, setBillAmount] = useState("9000");
  const [account, setAccount] = useState("checking");
  const [biller, setBiller] = useState<string | undefined>(undefined);
  const [accountType, setAccountType] = useState("SAVINGS");

  const add = (cents: number) => () =>
    setAmount(((Number.parseFloat(amount || "0") * 100 + cents) / 100).toFixed(2));

  return (
    <main className="mx-auto flex max-w-content flex-col gap-10 p-page md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-title text-ink">Components</h1>
          <p className="type-body text-ink-muted">
            Development preview of src/shared/ui against the UI spec&apos;s component sheet.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Buttons" note="52px default, 44px compact. One primary action per screen.">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Button>Primary</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button variant="soft" icon={ArrowLeftRight}>
            With icon
          </Button>
          <Button variant="outline" size="compact">
            Compact 44
          </Button>
          <Button size="compact">Compact 44</Button>
          <Button loading icon={ArrowLeftRight}>
            Loading with icon
          </Button>
          <Button asChild variant="outline">
            <a href="#fields">Link as button</a>
          </Button>
        </div>
      </Section>

      <Section
        title="Fields"
        note="Contained 52px inputs: visible boundary on grey pages, room for icons, explicit focus and error states."
      >
        <div id="fields" className="grid gap-5 md:grid-cols-3">
          <TextField label="Default" icon={User} placeholder="placeholder text" />
          <TextField
            label="Filled with hint"
            icon={Hash}
            defaultValue="2899 0108 46"
            hint="Helper text sits here."
          />
          <TextField label="Disabled" disabled defaultValue="Not editable" />
          <PasswordField
            label="Error"
            defaultValue="pass"
            error="Password must be at least 6 characters."
          />
          <PasswordField label="Password" placeholder="your password" />
          <SelectField
            label="Select"
            placeholder="Choose a biller"
            value={biller}
            onValueChange={setBiller}
            options={[
              { value: "ethio-telecom", label: "Ethio Telecom", icon: ReceiptText },
              { value: "eeu", label: "Ethiopian Electric Utility", icon: ReceiptText },
              { value: "aawsa", label: "Addis Ababa Water", icon: ReceiptText },
            ]}
          />
        </div>
      </Section>

      <Section
        title="Money inputs"
        note="The account picker shows the balance where the decision is made; the amount field is large, with quick chips."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            label="Account select"
            value={account}
            onValueChange={setAccount}
            options={[
              {
                value: "checking",
                label: "Checking · •••• 8057",
                description: "Available ETB 8,640.00",
                icon: Landmark,
              },
              {
                value: "savings",
                label: "Savings · •••• 8911",
                description: "Available ETB 2,200.00",
                icon: CircleDollarSign,
              },
            ]}
          />
          <AmountField
            label="Amount"
            value={amount}
            onChange={setAmount}
            quickAmounts={[
              { label: "+100", onSelect: add(10_000) },
              { label: "+500", onSelect: add(50_000) },
              { label: "+1,000", onSelect: add(100_000) },
              { label: "Max", onSelect: () => setAmount("8640.00") },
            ]}
          />
          <AmountField
            label="Amount (insufficient funds)"
            value={billAmount}
            onChange={setBillAmount}
            error="Insufficient funds. Available: ETB 8,640.00"
            quickAmounts={[
              { label: "+50", onSelect: () => {} },
              { label: "+100", onSelect: () => {} },
              { label: "+500", onSelect: () => {} },
              { label: "Max", onSelect: () => {} },
            ]}
          />
        </div>
      </Section>

      <Section title="Radio cards" note="Open an account: one choice, shown as cards.">
        <RadioCards
          className="max-w-md"
          label="Account type"
          value={accountType}
          onValueChange={setAccountType}
          options={[
            {
              value: "SAVINGS",
              label: "Savings",
              description: "Set money aside and earn interest.",
              icon: CircleDollarSign,
            },
            {
              value: "CHECKING",
              label: "Checking",
              description: "Everyday spending and transfers.",
              icon: Landmark,
            },
            {
              value: "MONEY_MARKET",
              label: "Money market",
              description: "Higher interest, limited withdrawals.",
              icon: Percent,
            },
          ]}
        />
      </Section>

      <p className="type-caption text-ink-muted">
        <Lock aria-hidden="true" className="mr-1 inline size-3.5" />
        Not available in production builds.
      </p>
    </main>
  );
}
