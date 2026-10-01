import { BalanceCard } from "./balance-card";
import { DashboardHeader } from "./dashboard-header";
import { MyAccounts } from "./my-accounts";
import { QuickActions } from "./quick-actions";
import { RecentActivity } from "./recent-activity";

/**
 * The home screen (UI spec, WebDashboard and Main): greeting, total balance,
 * quick actions, then the accounts and the latest activity. Two columns from
 * 1024 px; one below, in the mobile order.
 */
export function Dashboard() {
  return (
    <div className="flex flex-col gap-[1.375rem] md:gap-7">
      <DashboardHeader />
      <div className="grid grid-cols-1 gap-[1.375rem] lg:grid-cols-[1.1fr_1fr] lg:gap-6">
        <BalanceCard />
        <QuickActions />
      </div>
      <div className="grid grid-cols-1 gap-[1.375rem] lg:grid-cols-2 lg:gap-6">
        <MyAccounts />
        <RecentActivity />
      </div>
    </div>
  );
}
