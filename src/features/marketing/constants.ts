/** Marketing content constants — single source for landing copy & config. */

export const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Results", href: "#results" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

/** Standard detention economics used by the recovery calculator. */
export const DETENTION = {
  /** Free time (hours) before detention accrues, per broker norms. */
  FREE_HOURS: 2,
  /** Typical per-hour detention rate ($). */
  DEFAULT_RATE_PER_HOUR: 75,
  /** Historical share of billed detention that goes unpaid without follow-up. */
  UNPAID_RATE: 0.62,
  /** Our historical recovery success rate on pursued claims. */
  RECOVERY_SUCCESS_RATE: 0.87,
} as const;

/** Live counter seed — represents total recovered to date. */
export const RECOVERED_TO_DATE = 2_847_500;

/** Small deterministic drift so the counter feels live without a backend. */
export const RECOVERED_DAILY_DRIFT = 4_200;

export const TRUST_STATS = [
  { label: "Recovered for carriers", value: "$2.8M+" },
  { label: "Average claim recovered", value: "$1,180" },
  { label: "Recovery success rate", value: "87%" },
  { label: "Avg. days to payment", value: "34" },
] as const;

export const HOW_IT_WORKS = [
  {
    title: "Send us the load",
    body: "Text or email your rate confirmation. Our AI reads the broker, stops, appointment times, and detention terms automatically.",
  },
  {
    title: "We build the claim",
    body: "AI assembles a defensible detention claim with BOL, POD, and timestamps — then drafts the demand letter to the broker.",
  },
  {
    title: "We negotiate",
    body: "We handle every reply, follow-up, and settlement conversation. You get an SMS at each milestone. No back-and-forth for you.",
  },
  {
    title: "You get paid",
    body: "When the broker pays, we take our share and send you the rest. No recovery, no fee — ever.",
  },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "I was writing off detention for years. They recovered $9,400 across eleven loads in my first two months. I did nothing but forward emails.",
    name: "Marcus D.",
    role: "Owner-Operator · Dallas, TX",
    amount: "$9,400 recovered",
  },
  {
    quote:
      "Brokers stopped ghosting once these letters started landing. The AI drafts are sharper than anything my dispatcher wrote.",
    name: "Priya S.",
    role: "Fleet of 6 · Atlanta, GA",
    amount: "$21,750 recovered",
  },
  {
    quote:
      "No recovery, no fee is exactly what it says. Zero risk. They only win when I win. It's a no-brainer for any carrier.",
    name: "Tommy R.",
    role: "Owner-Operator · Chicago, IL",
    amount: "$5,120 recovered",
  },
] as const;

export const FAQ_ITEMS = [
  {
    q: "How much does it cost?",
    a: "Nothing upfront. We work on contingency — no recovery, no fee. When we recover your detention, we keep an agreed percentage and send you the rest. If we recover nothing, you owe nothing.",
  },
  {
    q: "What do I have to do?",
    a: "Forward your rate confirmation and any proof of delay (BOL, POD, gate timestamps). Our AI does the rest — building the claim, writing the broker, and following up. You'll get an SMS at each milestone.",
  },
  {
    q: "How far back can I claim detention?",
    a: "It depends on the broker's terms and your contract, but most detention claims are viable for 90–180 days. Send us the load and we'll tell you within a day whether it's recoverable.",
  },
  {
    q: "Will this hurt my broker relationships?",
    a: "No. We negotiate professionally and factually. Detention is money you're contractually owed. Reputable brokers respect a well-documented claim — and our data shows carriers who claim get faster payments going forward.",
  },
  {
    q: "What kinds of charges do you recover?",
    a: "Detention, layover, TONU (truck ordered not used), and other accessorials that brokers routinely underpay or ignore.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Documents are stored encrypted, access is restricted, and we never share your information with third parties. Your rate cons and BOLs stay private.",
  },
] as const;
