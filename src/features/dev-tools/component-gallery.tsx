"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CircleDollarSign,
  Hash,
  Landmark,
  Lock,
  Percent,
  ReceiptText,
  RotateCcw,
  ScrollText,
  User,
  WalletCards,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { ThemeToggle } from "@/shared/theme/theme-toggle";
import { AmountField } from "@/shared/ui/amount-field";
import { Button } from "@/shared/ui/button";
import { Card, SectionHeader } from "@/shared/ui/card";
import { Badge, InlineMessage } from "@/shared/ui/feedback";
import { FilterPills } from "@/shared/ui/filter-pills";
import { ListRow, RowList } from "@/shared/ui/list-row";
import { RadioCards } from "@/shared/ui/radio-cards";
import { SelectField } from "@/shared/ui/select-field";
import { ListRowSkeleton, LoadingRegion } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";
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
  const [direction, setDirection] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");

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

      <Section
        title="Rows"
        note="Tinted discs carry meaning: primary for accounts, green for money in, neutral for money out. Amounts are signed."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <SectionHeader title="My accounts" action={{ label: "View all", href: "#rows" }} />
            <Card className="overflow-hidden">
              <RowList>
                <ListRow
                  icon={Landmark}
                  tone="primary"
                  title="Checking"
                  meta="•••• 8057"
                  value="ETB 8,640.00"
                  valueMeta="Available"
                  href="#rows"
                />
                <ListRow
                  icon={CircleDollarSign}
                  tone="primary"
                  title="Savings"
                  meta="•••• 8911"
                  value="ETB 2,200.00"
                  valueMeta="Available"
                  href="#rows"
                />
              </RowList>
            </Card>
          </div>
          <div id="rows" className="flex flex-col gap-3">
            <SectionHeader title="Recent activity" action={{ label: "View all", href: "#rows" }} />
            <Card className="overflow-hidden">
              <RowList>
                <ListRow
                  icon={RotateCcw}
                  tone="credit"
                  title="Refund from merchant"
                  meta="Refund · 15:18"
                  value="+ETB 1,665.00"
                  valueClassName="text-credit"
                  onClick={() => {}}
                />
                <ListRow
                  icon={Percent}
                  title="Monthly access fee"
                  meta="Access fee · 20:18"
                  value="-ETB 15.00"
                  onClick={() => {}}
                />
              </RowList>
            </Card>
          </div>
        </div>
      </Section>

      <Section
        title="Filters, badges, feedback"
        note="Filter pills switch a list; badges label; messages inform."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <FilterPills
              label="Show"
              value={direction}
              onValueChange={setDirection}
              options={[
                { value: "ALL", label: "All" },
                {
                  value: "CREDIT",
                  label: "Money in",
                  icon: ArrowDownLeft,
                  iconClassName: "text-credit",
                },
                {
                  value: "DEBIT",
                  label: "Money out",
                  icon: ArrowUpRight,
                  iconClassName: "text-debit",
                },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="credit">Money in</Badge>
              <Badge tone="debit">Money out</Badge>
              <Badge tone="primary">2 accounts</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <InlineMessage>Informational message.</InlineMessage>
            <InlineMessage tone="success">Sent ETB 250.00 to 2899010846.</InlineMessage>
            <InlineMessage tone="warning">
              Transfers are instant and cannot be reversed. Check the account number.
            </InlineMessage>
            <InlineMessage tone="error">Your session expired. Please sign in again.</InlineMessage>
          </div>
        </div>
      </Section>

      <Section
        title="Loading, empty, error"
        note="Skeletons match the rows they stand in for; empty and error states say what to do next."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="overflow-hidden">
            <LoadingRegion label="Loading your accounts">
              <ul className="divide-y divide-border">
                <ListRowSkeleton />
                <ListRowSkeleton />
              </ul>
            </LoadingRegion>
          </Card>
          <Card>
            <EmptyState
              icon={ScrollText}
              title="No transactions yet"
              description="Money in and out of this account will show up here."
            />
          </Card>
          <Card>
            <ErrorState onRetry={() => {}} />
          </Card>
          <Card className="md:col-span-3">
            <EmptyState
              icon={WalletCards}
              title="No accounts yet"
              description="Open an account to start saving or making transfers."
              action={<Button size="compact">Open an account</Button>}
            />
          </Card>
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
