import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getUserSubscription } from "@/lib/db/queries";
import { PlanManager } from "@/components/subscription/plan-manager";

export const metadata: Metadata = { title: "Obuna" };

export default async function SubscriptionPage() {
  const user = await requireUser();
  const subscription = await getUserSubscription(user.id);
  const isPremium = subscription?.plan === "premium" && subscription.status === "active";

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Obuna</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Rejangizni boshqaring va barcha imkoniyatlarni oching.
        </p>
      </header>

      <PlanManager
        isPremium={isPremium}
        endDate={subscription?.endDate ? subscription.endDate.toISOString() : null}
      />
    </div>
  );
}
