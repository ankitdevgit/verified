import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button, Card, Chip } from "@/components/ui";
import { toBusiness } from "@/lib/api/adapters";
import { getBusiness as apiGetBusiness } from "@/lib/api/endpoints";
import "@/lib/api/mock-transport";
import { DASHBOARD_BUSINESS } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Profile · Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardProfilePage() {
  const dto = await apiGetBusiness(DASHBOARD_BUSINESS).catch(() => null);
  if (!dto) notFound();
  const business = toBusiness(dto);

  return (
    <div>
      <h2 className="border-b border-rule pb-3 text-base font-semibold">
        Listing details
      </h2>
      <p className="mt-3 text-xs text-ink-muted">
        These are the facts about your business. Scores, reviews and cost
        figures come from your customers and cannot be edited here.
      </p>

      <Card className="mt-5 p-5">
        <form className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" defaultValue={business.name} />
          <Field label="Descriptor" defaultValue={business.kind} />
          <Field label="Street address" defaultValue={business.addressLine} />
          <Field label="Area" defaultValue={business.area} />
          <Field label="City" defaultValue={business.city} />
          <Field label="Pincode" defaultValue={business.pincode} ledger />
          <Field label="Phone" defaultValue={business.phone} ledger />
          <Field label="Hours" defaultValue={business.hours} />

          <div className="sm:col-span-2">
            <span className="text-xs font-medium">Specialities</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {business.specialities.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Button className="min-h-11 px-5 text-sm">Save changes</Button>
          </div>
        </form>
      </Card>

      <section className="mt-8">
        <h2 className="border-b border-rule pb-3 text-base font-semibold">
          What you can&apos;t change
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-ink-muted">
          <li>
            Your verified score, your unverified score, and the number of each.
          </li>
          <li>
            The typical bill range — it is computed from uploaded bills, not
            from your price list.
          </li>
          <li>The order reviews appear in, and whether any of them appear.</li>
        </ul>
      </section>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  ledger = false,
}: {
  label: string;
  defaultValue: string;
  ledger?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium">{label}</span>
      <input
        type="text"
        defaultValue={defaultValue}
        className={`mt-1.5 min-h-12 w-full rounded-input border border-rule bg-surface px-3 text-sm ${
          ledger ? "ledger" : ""
        }`}
      />
    </label>
  );
}
