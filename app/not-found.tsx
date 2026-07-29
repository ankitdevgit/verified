import Link from "next/link";
import { Seal } from "@/components/seal";
import { ButtonLink } from "@/components/ui";
import { SITE } from "@/lib/site";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <Seal size={48} filled={false} className="stamp mx-auto text-ink-muted" />
      <h1 className="mt-6 text-2xl">Nothing at this address.</h1>
      <p className="mt-2 text-sm text-ink-muted">
        The page may have moved, or a review may have been removed under the
        review policy.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to search</ButtonLink>
        <ButtonLink
          href={`/c/hospitals/${SITE.launchCity.toLowerCase()}`}
          variant="secondary"
        >
          Browse hospitals
        </ButtonLink>
      </div>
      <p className="mt-6 text-xs text-ink-muted">
        Think this is a mistake?{" "}
        <Link href="/legal/grievance" className="text-link hover:underline">
          Tell the grievance officer
        </Link>
        .
      </p>
    </div>
  );
}
