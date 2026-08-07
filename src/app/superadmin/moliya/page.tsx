import { FinanceView } from "./finance-view";
import { getPayments, getPlans, getRevenue } from "@/lib/superadmin/queries";

export const metadata = { title: "Moliya" };

export default async function SuperAdminFinancePage() {
  const [revenue, plans, payments] = await Promise.all([getRevenue(), getPlans(), getPayments()]);
  return <FinanceView revenue={revenue} plans={plans} payments={payments} />;
}
