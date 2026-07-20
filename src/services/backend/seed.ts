import { addDays, subDays, subHours, formatISO } from "date-fns";
import type { Database } from "@/services/backend/store";
import { ChargeType, type ID } from "@/types/common";
import { StopType, type Load, type LoadStop } from "@/types/load";
import {
  ClaimStatus,
  type Claim,
  type ClaimTimelineEvent,
  CLAIM_STATUS_META,
} from "@/types/claim";
import { LeadStatus, type CaseLead } from "@/types/lead";
import { DocumentKind, type StoredDocument } from "@/types/document";
import {
  ActivityType,
  MessageDirection,
  ReplyClassification,
  SmsEvent,
  type Activity,
  type EmailMessage,
  type SmsMessage,
} from "@/types/communication";
import { FollowUpCadence, FollowUpStatus, type FollowUp } from "@/types/followup";
import type { Broker } from "@/types/broker";
import { calculateDetention, detectMissingDocuments } from "@/services/domain/detention";
import { calculateChargeAmount } from "@/services/domain/charges";
import { calculateCommission } from "@/services/domain/commission";
import { scoreBrokerRisk, scoreLoadStrength, estimateRecoveryProbability } from "@/services/domain/risk";
import { DEFAULT_SETTINGS } from "@/types/user";

export const OWNER_ID = "owner_admin";

/** Deterministic PRNG (mulberry32) for reproducible seeds. */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(20260719);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const between = (min: number, max: number): number => Math.round(min + rng() * (max - min));
const iso = (d: Date): string => formatISO(d);
let idc = 0;
const nid = (p: string): ID => `${p}_${(++idc).toString(36)}_${Math.floor(rng() * 1e6).toString(36)}`;

const now = new Date("2026-07-19T15:00:00Z");

/** Status groups typed as ClaimStatus[] so `.includes()` accepts a wide status. */
const REPLIED_ONWARD: ClaimStatus[] = [
  ClaimStatus.BrokerReplied,
  ClaimStatus.Negotiating,
  ClaimStatus.SettlementOffered,
  ClaimStatus.Approved,
  ClaimStatus.Paid,
  ClaimStatus.Denied,
];
const OPEN_SENT: ClaimStatus[] = [ClaimStatus.Sent, ClaimStatus.BrokerReplied, ClaimStatus.Negotiating];
const HAS_INBOUND: ClaimStatus[] = [
  ClaimStatus.BrokerReplied,
  ClaimStatus.Negotiating,
  ClaimStatus.SettlementOffered,
];
const RESOLVED: ClaimStatus[] = [ClaimStatus.Paid, ClaimStatus.Denied, ClaimStatus.Closed];

const BROKER_SEED = [
  { name: "TQL Logistics", mc: "MC-333456", pace: "slow" },
  { name: "RXO Transport", mc: "MC-778901", pace: "fast" },
  { name: "Coyote Freight", mc: "MC-112233", pace: "medium" },
  { name: "Echo Global", mc: "MC-445566", pace: "medium" },
  { name: "Arrive Logistics", mc: "MC-990011", pace: "fast" },
  { name: "Nolan Brokerage", mc: "MC-221144", pace: "slow" },
] as const;

const CUSTOMERS = [
  { name: "Ironhorse Carriers", phone: "+12145550142", driver: "Marcus Davis" },
  { name: "Sunbelt Freight Co", phone: "+14045550188", driver: "Priya Sharma" },
  { name: "Great Lakes Hauling", phone: "+13125550171", driver: "Tommy Reed" },
  { name: "Rio Grande Transport", phone: "+19155550133", driver: "Luis Fuentes" },
  { name: "Cascade Logistics", phone: "+15035550109", driver: "Dana White" },
] as const;

const CITIES = [
  "Dallas, TX",
  "Atlanta, GA",
  "Chicago, IL",
  "Memphis, TN",
  "Laredo, TX",
  "Columbus, OH",
  "Phoenix, AZ",
  "Newark, NJ",
] as const;

function makeStops(freeHours: number): { stops: LoadStop[]; hasTimestamps: boolean } {
  const pickupDay = subDays(now, between(20, 90));
  const detainHours = pick([2.5, 3, 4, 5, 1.5, 6, 3.5]);
  const hasTimestamps = rng() > 0.15;
  const arrived = pickupDay;
  const departed = addDays(new Date(arrived.getTime() + detainHours * 3600_000), 0);

  const delivery = addDays(pickupDay, between(1, 3));
  const delDetain = pick([1, 2.5, 3, 4, 0.5, 5]);
  const delArrived = delivery;
  const delDeparted = new Date(delArrived.getTime() + delDetain * 3600_000);

  const stops: LoadStop[] = [
    {
      id: nid("stop"),
      type: StopType.Pickup,
      sequence: 1,
      facilityName: `${pick(CITIES).split(",")[0]} DC`,
      address: pick(CITIES),
      appointmentAt: iso(arrived),
      arrivedAt: hasTimestamps ? iso(arrived) : undefined,
      departedAt: hasTimestamps ? iso(departed) : undefined,
    },
    {
      id: nid("stop"),
      type: StopType.Delivery,
      sequence: 2,
      facilityName: `${pick(CITIES).split(",")[0]} Whse`,
      address: pick(CITIES),
      appointmentAt: iso(delArrived),
      arrivedAt: hasTimestamps ? iso(delArrived) : undefined,
      departedAt: hasTimestamps ? iso(delDeparted) : undefined,
    },
  ];
  void freeHours;
  return { stops, hasTimestamps };
}

export function seedDatabase(): Database {
  idc = 0;
  const brokers: Broker[] = [];
  const loads: Load[] = [];
  const claims: Claim[] = [];
  const documents: StoredDocument[] = [];
  const followups: FollowUp[] = [];
  const activities: Activity[] = [];
  const emails: EmailMessage[] = [];
  const messages: SmsMessage[] = [];

  const freeHours = DEFAULT_SETTINGS.defaultFreeHours;

  // Build brokers first (intel filled after claims exist).
  BROKER_SEED.forEach((b, i) => {
    brokers.push({
      id: `broker_${i + 1}`,
      name: b.name,
      mcNumber: b.mc,
      email: `claims@${b.name.split(" ")[0].toLowerCase()}.com`,
      billingEmail: `ap@${b.name.split(" ")[0].toLowerCase()}.com`,
      phone: `+1${between(2000000000, 9999999999)}`,
      createdAt: iso(subDays(now, 200)),
      updatedAt: iso(now),
      ownerId: OWNER_ID,
      intel: {
        totalClaims: 0,
        recoveredAmount: 0,
        pendingAmount: 0,
        recoveryRate: 0,
        avgPaymentDays: 0,
        avgReplyHours: between(2, 48),
        delayScore: 40,
        riskScore: 40,
        riskLevel: "medium",
      },
    });
  });

  const statusPlan: ClaimStatus[] = [
    ClaimStatus.Paid,
    ClaimStatus.Paid,
    ClaimStatus.Paid,
    ClaimStatus.Paid,
    ClaimStatus.Sent,
    ClaimStatus.Sent,
    ClaimStatus.BrokerReplied,
    ClaimStatus.Negotiating,
    ClaimStatus.SettlementOffered,
    ClaimStatus.Approved,
    ClaimStatus.Denied,
    ClaimStatus.Draft,
    ClaimStatus.Paid,
    ClaimStatus.BrokerReplied,
    ClaimStatus.Negotiating,
    ClaimStatus.Sent,
  ];

    // Charge-type mix so the app shows detention, layover, TONU & accessorial.
    const chargePlan: ChargeType[] = [
      ChargeType.Detention, ChargeType.Detention, ChargeType.Layover, ChargeType.Detention,
      ChargeType.Tonu, ChargeType.Detention, ChargeType.Detention, ChargeType.Layover,
      ChargeType.Detention, ChargeType.Accessorial, ChargeType.Detention, ChargeType.Detention,
      ChargeType.Tonu, ChargeType.Detention, ChargeType.Layover, ChargeType.Detention,
    ];

  statusPlan.forEach((status, index) => {
    const broker = brokers[index % brokers.length];
    const customer = pick(CUSTOMERS);
    const ratePerHour = pick([65, 75, 85, 50, 100]);
    const { stops, hasTimestamps } = makeStops(freeHours);
    const detention = calculateDetention(stops, freeHours, ratePerHour);

    const chargeType = chargePlan[index] ?? ChargeType.Detention;
    const layoverNights = chargeType === ChargeType.Layover ? pick([1, 2]) : undefined;
    const layoverNightlyRate = chargeType === ChargeType.Layover ? pick([150, 200, 250]) : undefined;
    const tonuAmount = chargeType === ChargeType.Tonu ? pick([150, 250, 300]) : undefined;
    const accessorialAmount = chargeType === ChargeType.Accessorial ? pick([120, 180, 240]) : undefined;
    const accessorialDescription =
      chargeType === ChargeType.Accessorial ? "Lumper fee reimbursement" : undefined;
    const charge = calculateChargeAmount({
      chargeType,
      detentionAmount: detention.amount,
      layoverNights,
      layoverNightlyRate,
      tonuAmount,
      accessorialAmount,
    });

    const hasBol = rng() > 0.2;
    const hasPod = rng() > 0.25;
    const docFlags = {
      hasRateConfirmation: true,
      hasBol,
      hasPod,
      hasTimestamps,
    };
    const partialLoad = { documents: docFlags, stops };
    const missingDocuments = detectMissingDocuments(partialLoad, chargeType);
    const strength = scoreLoadStrength({
      chargeType,
      documents: docFlags,
      billableDetentionHours: detention.billableHours,
      chargeAmount: charge.amount,
      missingDocuments,
    });

    const loadId = `load_${index + 1}`;
    const claimId = `claim_${index + 1}`;
    const createdAt = subDays(now, between(15, 85));

    const load: Load = {
      id: loadId,
      referenceNumber: `LD-${between(10000, 99999)}`,
      brokerId: broker.id,
      brokerName: broker.name,
      customerName: customer.name,
      customerPhone: customer.phone,
      driverName: customer.driver,
      chargeType,
      freeHours,
      ratePerHour,
      stops,
      billableDetentionHours: detention.billableHours,
      detentionAmount: detention.amount,
      layoverNights,
      layoverNightlyRate,
      tonuAmount,
      accessorialAmount,
      accessorialDescription,
      chargeAmount: charge.amount,
      chargeBasis: charge.basis,
      documents: docFlags,
      riskScore: strength.score,
      riskLevel: strength.level,
      missingDocuments,
      notes: "",
      claimId,
      createdAt: iso(createdAt),
      updatedAt: iso(now),
      ownerId: OWNER_ID,
    };
    loads.push(load);

    // Documents for this load.
    const kinds: { kind: (typeof DocumentKind)[keyof typeof DocumentKind]; when: boolean }[] = [
      { kind: DocumentKind.RateConfirmation, when: true },
      { kind: DocumentKind.Bol, when: hasBol },
      { kind: DocumentKind.Pod, when: hasPod },
    ];
    kinds.filter((k) => k.when).forEach((k) => {
      documents.push({
        id: nid("doc"),
        kind: k.kind,
        name: `${load.referenceNumber}-${k.kind}.pdf`,
        contentType: "application/pdf",
        sizeBytes: between(80_000, 900_000),
        url: "#",
        loadId,
        claimId,
        brokerName: broker.name,
        aiSummary: `${k.kind === DocumentKind.RateConfirmation ? "Rate confirmation" : k.kind.toUpperCase()} for load ${load.referenceNumber}.`,
        tags: [broker.name],
        createdAt: iso(createdAt),
        updatedAt: iso(now),
        ownerId: OWNER_ID,
      });
    });

    // Claim economics.
    const meta = CLAIM_STATUS_META[status];
    const commissionRate = DEFAULT_SETTINGS.defaultCommissionRate;
    const isPaid = status === ClaimStatus.Paid;
    const isApproved = status === ClaimStatus.Approved;
    const settlementFactor = pick([0.75, 0.85, 1, 0.9]);
    const recovered = isPaid
      ? Math.round(charge.amount * settlementFactor)
      : isApproved
        ? Math.round(charge.amount * settlementFactor)
        : 0;
    const commission = calculateCommission(recovered, commissionRate);

    const sentAt = status === ClaimStatus.Draft ? null : subDays(now, between(10, 60));
    const daysToRecover = isPaid ? between(18, 55) : null;
    const paidAt = isPaid && sentAt ? addDays(sentAt, daysToRecover ?? 30) : null;

    const timeline: ClaimTimelineEvent[] = [
      {
        id: nid("tl"),
        at: iso(createdAt),
        status: ClaimStatus.Draft,
        title: "Claim drafted by AI",
        description: "Detention claim assembled from load evidence.",
        automated: true,
      },
    ];
    if (sentAt) {
      timeline.push({
        id: nid("tl"),
        at: iso(sentAt),
        status: ClaimStatus.Sent,
        title: "Claim sent to broker",
        description: `Demand letter delivered to ${broker.email}.`,
        automated: true,
      });
    }
    if (REPLIED_ONWARD.includes(status) && sentAt) {
      timeline.push({
        id: nid("tl"),
        at: iso(addDays(sentAt, between(2, 8))),
        status: ClaimStatus.BrokerReplied,
        title: "Broker replied",
        automated: false,
      });
    }
    if (paidAt) {
      timeline.push({
        id: nid("tl"),
        at: iso(paidAt),
        status: ClaimStatus.Paid,
        title: "Payment received",
        description: `Recovered $${recovered.toLocaleString()}.`,
        automated: true,
      });
    }

    const firstReplyAt =
      sentAt && status !== ClaimStatus.Sent && status !== ClaimStatus.Draft
        ? iso(addDays(sentAt, between(2, 8)))
        : null;

    const claim: Claim = {
      id: claimId,
      claimNumber: `CLM-${2600 + index}`,
      loadId,
      loadReference: load.referenceNumber,
      brokerId: broker.id,
      brokerName: broker.name,
      customerName: customer.name,
      customerPhone: customer.phone,
      chargeType,
      status,
      claimedAmount: charge.amount,
      recoveredAmount: recovered,
      settlementOffer:
        status === ClaimStatus.SettlementOffered ? Math.round(charge.amount * 0.7) : null,
      commissionRate,
      commissionAmount: commission.commissionAmount,
      carrierPayout: commission.carrierPayout,
      sentAt: sentAt ? iso(sentAt) : null,
      firstReplyAt,
      resolvedAt: isPaid || status === ClaimStatus.Denied ? iso(paidAt ?? now) : null,
      paidAt: paidAt ? iso(paidAt) : null,
      daysToRecover,
      recoveryProbability: estimateRecoveryProbability({
        brokerRecoveryRate: 70,
        loadStrengthScore: strength.score,
        hasCompleteEvidence: missingDocuments.length === 0,
      }),
      predictedPaymentDate:
        sentAt && !isPaid && status !== ClaimStatus.Denied
          ? iso(addDays(sentAt, between(30, 50)))
          : null,
      timeline,
      evidenceIds: documents.filter((d) => d.claimId === claimId).map((d) => d.id),
      claimLetter: undefined,
      tags: meta.tone === "warning" ? ["needs-attention"] : [],
      notes: "",
      archived: status === ClaimStatus.Closed,
      createdAt: iso(createdAt),
      updatedAt: iso(now),
      ownerId: OWNER_ID,
    };
    claims.push(claim);

    // A follow-up for open, sent claims.
    if (OPEN_SENT.includes(status) && sentAt) {
      const fuCreated = iso(sentAt);
      followups.push({
        id: nid("fu"),
        claimId,
        claimNumber: claim.claimNumber,
        brokerName: broker.name,
        cadence: FollowUpCadence.Day7,
        status: rng() > 0.3 ? FollowUpStatus.Scheduled : FollowUpStatus.Sent,
        scheduledFor: iso(addDays(now, between(1, 9))),
        sentAt: null,
        sequence: between(1, 3),
        draftMessage: undefined,
        createdAt: fuCreated,
        updatedAt: iso(now),
        ownerId: OWNER_ID,
      });
    }

    // Inbound email for replied/negotiating claims.
    if (HAS_INBOUND.includes(status) && sentAt) {
      const threadId = nid("thread");
      emails.push({
        id: nid("email"),
        claimId,
        providerMessageId: nid("msg"),
        threadId,
        direction: MessageDirection.Outbound,
        from: DEFAULT_SETTINGS.companyEmail,
        to: broker.email ?? "",
        subject: `Detention claim ${claim.claimNumber} — Load ${load.referenceNumber}`,
        body: "Please find attached our detention claim with supporting documentation…",
        sentAt: iso(sentAt),
        read: true,
        createdAt: iso(sentAt),
        updatedAt: iso(sentAt),
        ownerId: OWNER_ID,
      });
      const inboundAt = iso(addDays(sentAt, between(2, 6)));
      emails.push({
        id: nid("email"),
        claimId,
        providerMessageId: nid("msg"),
        threadId,
        direction: MessageDirection.Inbound,
        from: broker.email ?? "",
        to: DEFAULT_SETTINGS.companyEmail,
        subject: `RE: Detention claim ${claim.claimNumber}`,
        body:
          status === ClaimStatus.SettlementOffered
            ? "We can offer 70% of the claimed amount to resolve this quickly."
            : "We've received your claim and are reviewing the timestamps with the facility.",
        sentAt: inboundAt,
        classification:
          status === ClaimStatus.SettlementOffered
            ? ReplyClassification.SettlementOffer
            : ReplyClassification.Acknowledgement,
        read: rng() > 0.5,
        createdAt: inboundAt,
        updatedAt: inboundAt,
        ownerId: OWNER_ID,
      });
    }

    // Milestone SMS to the customer.
    if (sentAt) {
      messages.push({
        id: nid("sms"),
        channel: "sms",
        direction: MessageDirection.Outbound,
        to: customer.phone,
        from: DEFAULT_SETTINGS.companyPhone,
        body: `Good news — we've sent your detention claim ${claim.claimNumber} to ${broker.name}. We'll keep you posted.`,
        event: SmsEvent.ClaimSent,
        claimId,
        status: "delivered",
        createdAt: iso(sentAt),
        updatedAt: iso(sentAt),
        ownerId: OWNER_ID,
      });
    }
  });

  // Recompute broker intel from their claims.
  brokers.forEach((broker) => {
    const brokerClaims = claims.filter((c) => c.brokerId === broker.id);
    const risk = scoreBrokerRisk(brokerClaims);
    const recoveredAmount = brokerClaims
      .filter((c) => c.status === ClaimStatus.Paid)
      .reduce((sum, c) => sum + c.recoveredAmount, 0);
    const pendingAmount = brokerClaims
      .filter((c) => !RESOLVED.includes(c.status))
      .reduce((sum, c) => sum + c.claimedAmount, 0);
    broker.intel = {
      totalClaims: brokerClaims.length,
      recoveredAmount,
      pendingAmount,
      recoveryRate: risk.recoveryRate,
      avgPaymentDays: risk.avgPaymentDays,
      avgReplyHours: broker.intel.avgReplyHours,
      delayScore: risk.delayScore,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      aiSuggestion:
        risk.riskLevel === "high"
          ? "Slow payer with frequent pushback. Lead with facility timestamps and set firm 7-day follow-ups."
          : risk.riskLevel === "low"
            ? "Reliable payer. Standard claim language and cadence work well."
            : "Moderate. Include POD up front to preempt document requests.",
    };
  });

  // Case leads (landing + manual).
  const leadSeed: Array<Pick<CaseLead, "companyName" | "contactName" | "brokerName" | "status" | "loadCount"> & { days: number }> = [
    { companyName: "Falcon Freight LLC", contactName: "Derek Malone", brokerName: "TQL Logistics", status: LeadStatus.New, loadCount: "2-5", days: 0 },
    { companyName: "Blue Ridge Hauling", contactName: "Sara Kim", brokerName: "Coyote Freight", status: LeadStatus.New, loadCount: "1", days: 1 },
    { companyName: "Lone Star Transport", contactName: "Miguel Ortiz", brokerName: "RXO Transport", status: LeadStatus.Reviewed, loadCount: "6-20", days: 3 },
    { companyName: "Summit Carriers", contactName: "Angela Booth", brokerName: "Echo Global", status: LeadStatus.Contacted, loadCount: "2-5", days: 5 },
    { companyName: "Delta Line Freight", contactName: "Roy Chen", brokerName: "Nolan Brokerage", status: LeadStatus.RecoveryStarted, loadCount: "20+", days: 9 },
    { companyName: "Prairie Logistics", contactName: "Nina Patel", brokerName: "Arrive Logistics", status: LeadStatus.Recovered, loadCount: "6-20", days: 40 },
    { companyName: "Coastal Cartage", contactName: "Wes Turner", brokerName: "TQL Logistics", status: LeadStatus.Rejected, loadCount: "1", days: 20 },
  ];
  const leads: CaseLead[] = leadSeed.map((l, i) => ({
    id: `lead_${i + 1}`,
    companyName: l.companyName,
    contactName: l.contactName,
    phone: `+1${between(2000000000, 9999999999)}`,
    email: `${l.contactName.split(" ")[0].toLowerCase()}@${l.companyName.split(" ")[0].toLowerCase()}.com`,
    brokerName: l.brokerName,
    loadCount: l.loadCount,
    estimatedAmount: between(400, 6000),
    details: "Detained multiple hours; broker slow to respond.",
    status: l.status,
    source: "landing",
    tags: [],
    notes: [],
    linkedClaimId: null,
    lastContactedAt: l.status === LeadStatus.New ? null : iso(subDays(now, l.days)),
    createdAt: iso(subDays(now, l.days)),
    updatedAt: iso(now),
    ownerId: OWNER_ID,
  }));

  // Recent activity feed.
  const activitySeed: Array<Omit<Activity, keyof import("@/types/common").BaseEntity> & { hoursAgo: number }> = [
    { type: ActivityType.PaymentReceived, title: "Payment received", description: `RXO Transport paid claim CLM-2603`, claimId: "claim_4", automated: true, hoursAgo: 3 },
    { type: ActivityType.BrokerReplied, title: "Broker replied", description: "Coyote Freight sent a settlement offer", claimId: "claim_9", automated: false, hoursAgo: 6 },
    { type: ActivityType.ClaimSent, title: "Claim sent", description: "New detention claim delivered to TQL Logistics", claimId: "claim_5", automated: true, hoursAgo: 9 },
    { type: ActivityType.LeadCreated, title: "New case lead", description: "Falcon Freight LLC submitted a load", leadId: "lead_1", automated: false, hoursAgo: 12 },
    { type: ActivityType.FollowUpSent, title: "Follow-up sent", description: "7-day follow-up to Nolan Brokerage", claimId: "claim_8", automated: true, hoursAgo: 26 },
    { type: ActivityType.AiAction, title: "AI drafted reply", description: "Reply drafted for Echo Global on CLM-2609", claimId: "claim_9", automated: true, hoursAgo: 30 },
  ];
  activitySeed.forEach((a, i) => {
    activities.push({
      id: `act_${i + 1}`,
      type: a.type,
      title: a.title,
      description: a.description,
      claimId: a.claimId ?? null,
      leadId: a.leadId ?? null,
      loadId: null,
      brokerId: null,
      automated: a.automated,
      createdAt: iso(subHours(now, a.hoursAgo)),
      updatedAt: iso(subHours(now, a.hoursAgo)),
      ownerId: OWNER_ID,
    });
  });

  return {
    brokers,
    loads,
    claims,
    leads,
    documents,
    emails,
    messages,
    followups,
    activities,
    settings: { ...DEFAULT_SETTINGS },
  };
}
