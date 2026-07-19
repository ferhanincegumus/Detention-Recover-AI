/**
 * Base44 Functions: AI (InvokeLLM contracts)
 * These mirror the app-side contracts in src/services/api/ai.ts. Deploy each
 * exported handler as its own Base44 function of the same name.
 */
import { entities, InvokeLLM } from "@base44/sdk";

/** ai-parse-ratecon — extract structured load fields from a rate confirmation. */
export async function parseRateCon(req) {
  const { fileUrl } = req.body;
  return InvokeLLM({
    prompt: "Extract the broker name, load reference, free time (hours), detention rate per hour, driver, customer phone, and every stop (type, facility, address, appointment time) from this rate confirmation. Flag any missing gate timestamps.",
    fileUrls: [fileUrl],
    responseFormat: {
      brokerName: "string", referenceNumber: "string", freeHours: "number",
      ratePerHour: "number", customerPhone: "string", driverName: "string",
      stops: "array", confidence: "number", warnings: "array",
    },
  });
}

/** ai-write-claim — draft a formal detention demand letter. */
export async function writeClaim(req) {
  const claim = await entities.Claim.get(req.body.claimId);
  const load = await entities.Load.get(claim.loadId);
  return InvokeLLM({
    prompt: `Write a formal, professional detention demand letter to ${claim.brokerName} for load ${claim.loadReference}. Amount due: $${claim.claimedAmount}. Cite gate in/out timestamps and attached BOL/POD. Be factual and firm, request payment within 15 days.`,
    context: { claim, load },
    responseFormat: { subject: "string", body: "string" },
  });
}

/** ai-generate-reply — draft a reply tuned to the broker's latest message. */
export async function generateReply(req) {
  const { claimId, incomingBody, classification } = req.body;
  const claim = await entities.Claim.get(claimId);
  return InvokeLLM({
    prompt: `Draft a reply to ${claim.brokerName} on claim ${claim.claimNumber}. Their message ("${classification}"): "${incomingBody}". Keep it factual, firm, and professional. Push toward payment of $${claim.claimedAmount}.`,
  });
}

/** ai-classify-reply — classify an inbound broker email. */
export async function classifyReply(req) {
  return InvokeLLM({
    prompt: `Classify this broker email into exactly one: payment, settlement_offer, denial, request_documents, question, acknowledgement, out_of_office, other.\n\n${req.body.body}`,
    responseFormat: { classification: "string" },
  });
}

/** ai-defense-report — assess defensibility and evidence gaps. */
export async function defenseReport(req) {
  const claim = await entities.Claim.get(req.body.claimId);
  const load = await entities.Load.get(claim.loadId);
  return InvokeLLM({
    prompt: `Assess the defensibility of detention claim ${claim.claimNumber}. List strengths, evidence gaps (${(load.missingDocuments || []).join(", ") || "none"}), and a recommendation. Estimate recovery probability 0-100.`,
    context: { claim, load },
    responseFormat: { report: "string", recoveryProbability: "number" },
  });
}
