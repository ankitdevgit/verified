import { SITE } from "./site";

export interface LegalDoc {
  slug: string;
  title: string;
  summary: string;
  updated: string;
  sections: { heading: string; paragraphs: string[] }[];
}

/**
 * Plain-language policy copy. These are drafting baselines that state the
 * product's actual commitments — they still need a lawyer's pass before launch,
 * particularly the health-data and intermediary-liability sections.
 */
export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "terms",
    title: "Terms of use",
    summary: "What you agree to by using the site, in the shortest form we can write it.",
    updated: "2026-07-01",
    sections: [
      {
        heading: "Who can post",
        paragraphs: [
          `Browsing ${SITE.name} needs no account. Publishing a review needs a verified phone number, because one person should mean one voice, and a phone number is the cheapest honest check we have.`,
          "Your number is never shown on a review, never sold, and never given to a business.",
        ],
      },
      {
        heading: "What you can post",
        paragraphs: [
          "Your own first-hand experience of a place you actually went to. Not someone else's, not a summary of what you read, and not an experience you were paid or rewarded to describe.",
          "Reviews must not name an individual's private details — a staff member's phone number, home address, or medical information — and must not target anyone for who they are.",
          "You keep ownership of what you write. You give us a licence to publish it, translate it, and show it in search results.",
        ],
      },
      {
        heading: "One bill, one review",
        paragraphs: [
          "Every uploaded bill is hashed. Once a bill has been used for a review it cannot be used again, by you or anyone else. Attempting to reuse bills, upload bills that aren't yours, or run multiple accounts will get those accounts closed.",
          "We cap review volume per account per day. The cap exists to make review farms uneconomic, not to slow you down.",
        ],
      },
      {
        heading: "What we can do",
        paragraphs: [
          "We can remove content that breaks the review policy, and we will tell you which rule it broke and give you an appeal.",
          "We can correct a verification status if we later find the underlying bill was fraudulent.",
          "We do not edit the substance of your review, and we never reorder reviews in a business's favour.",
        ],
      },
      {
        heading: "What we don't promise",
        paragraphs: [
          "A verified badge confirms that a bill matched a business, a date and an amount. It is not a statement that the reviewer's opinion is correct, and it is not medical, legal or financial advice.",
          `${SITE.name} is provided as-is. Decide for yourself, and take a doctor's advice from a doctor.`,
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    summary: "What we collect, what we destroy, and what a business can never see.",
    updated: "2026-07-01",
    sections: [
      {
        heading: "What we collect",
        paragraphs: [
          "Your phone number, to verify you are one person. Your reviews, ratings and the structured fields you fill in. The bills you upload and the fields we extract from them. Basic device and usage signals we use to detect fraud.",
          "We do not collect your contacts, and we do not track you across other sites.",
        ],
      },
      {
        heading: "Bills and health data",
        paragraphs: [
          "A hospital bill can name a diagnosis, which makes it sensitive personal data. We treat it that way.",
          "Before a bill is stored we auto-redact your name, patient ID and diagnosis, and we show you the result so you can blur anything else. By default we destroy the raw image 90 days after extraction and keep only the extracted fields and the hash. You can set this to immediate destruction, and you can delete any bill — or all of them — at any time.",
          "The bill image is never shown on a public page and is never shared with the business, including during a dispute. Only our moderators can see it, and only when a review is under review or disputed.",
        ],
      },
      {
        heading: "What is public",
        paragraphs: [
          "Your display name (or nothing, if you post anonymously), your reviewer level, your reviews, their ratings, and the amount and date from the bill. That is the complete list.",
          "Your phone number, email address, receipts and account settings are never public.",
        ],
      },
      {
        heading: "Anonymous reviews",
        paragraphs: [
          "Posting anonymously hides your name from the public review and from the business. It does not remove the verified badge — the proof stands on the bill, not on your name.",
          "We still know who you are internally, because otherwise the anti-fraud checks would be meaningless.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You can export your data, delete individual reviews and receipts, or delete your account entirely. Deleting your account removes your reviews.",
          `Ask us anything about your data at ${SITE.grievanceEmail}.`,
        ],
      },
    ],
  },
  {
    slug: "review-policy",
    title: "Review policy",
    summary: "The rules a review has to clear, and what happens when it doesn't.",
    updated: "2026-07-01",
    sections: [
      {
        heading: "The rules",
        paragraphs: [
          "First-hand only. You went there; you're describing what happened to you.",
          "No incentives. If anyone paid, discounted, gifted or pressured you for this review, it doesn't belong here. This applies to businesses and to us — we run no incentive programme of any kind.",
          "No private details about individuals. Criticise a doctor's decisions and a hospital's process all you like; do not publish anyone's phone number, address, or health information.",
          "No conflicts of interest. Not the owner, not staff, not a competitor.",
          "Stay on the subject. A review is about the visit, not about politics, and not about another reviewer.",
        ],
      },
      {
        heading: "How verification affects a review",
        paragraphs: [
          "A verified review counts in full towards the headline score. A review with a bill under review is shown but held out of the score until a human resolves it. An unverified review is published, labelled, and counts for nothing in the headline score.",
          "We never delete a review for being negative, and we never promote one for being positive.",
        ],
      },
      {
        heading: "When a review is removed",
        paragraphs: [
          "You get told which rule it broke, in specific terms — not a generic notice. You can edit and resubmit, or appeal to a different moderator.",
          "Repeated violations, or any attempt at bill fraud, close the account.",
        ],
      },
      {
        heading: "Businesses",
        paragraphs: [
          "A business can reply publicly and can raise a dispute with evidence. A disputed review is labelled and frozen in the score until a moderator decides: upheld, rejected, or edited to remove defamatory text while the rating stands.",
          "A business can never delete a review, reorder reviews, or pay to hide one. If we detect a business soliciting reviews, the listing carries a label saying so.",
        ],
      },
    ],
  },
  {
    slug: "grievance",
    title: "Grievance officer",
    summary: "Who to contact, and how long we take.",
    updated: "2026-07-01",
    sections: [
      {
        heading: "Contact",
        paragraphs: [
          `Email ${SITE.grievanceEmail} with the URL of the page, what the problem is, and what you'd like done about it.`,
          "We acknowledge every complaint within 24 hours and resolve most within 15 days.",
        ],
      },
      {
        heading: "What the grievance officer handles",
        paragraphs: [
          "Content you believe is unlawful or defamatory. Requests to take down personal information. Complaints about how a report, dispute or appeal was handled. Data access, correction and deletion requests.",
        ],
      },
      {
        heading: "Listings",
        paragraphs: [
          "We list businesses whether or not they have claimed a profile, which is standard practice for review platforms. If you are the owner and want the listing corrected, claim it. If you believe a listing should not exist at all, write to the grievance officer with the reason and we will respond with a decision rather than silence.",
        ],
      },
    ],
  },
];

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}
