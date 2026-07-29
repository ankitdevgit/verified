/**
 * Which listing the business dashboard shows.
 *
 * There is no auth layer on the web dashboard yet — §8.6 scopes owner calls by
 * `business_members`, which means the ID comes from the session once sign-in
 * lands. Until then it is pinned here, in one place, so wiring it up is a
 * one-line change rather than a hunt.
 */
export const DASHBOARD_BUSINESS = "ruby-hall-clinic-pune";
