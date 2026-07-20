import { z } from "zod";
import { StopType } from "@/types/load";
import { ChargeType } from "@/types/common";

const stopSchema = z.object({
  type: z.nativeEnum(StopType),
  sequence: z.number(),
  facilityName: z.string().trim().optional(),
  // Address is only required for detention (enforced in superRefine below).
  address: z.string().trim().optional().default(""),
  appointmentAt: z.string().optional(),
  arrivedAt: z.string().optional(),
  departedAt: z.string().optional(),
});

export const loadFormSchema = z
  .object({
    referenceNumber: z.string().trim().min(2, "Reference required"),
    brokerName: z.string().trim().min(2, "Broker required"),
    customerName: z.string().trim().optional(),
    customerPhone: z.string().trim().optional(),
    driverName: z.string().trim().optional(),
    chargeType: z.nativeEnum(ChargeType),
    // Detention
    freeHours: z.coerce.number().min(0).max(24),
    ratePerHour: z.coerce.number().min(0).max(1000),
    stops: z.array(stopSchema).min(1, "At least one stop"),
    // Layover
    layoverNights: z.coerce.number().min(0).max(60),
    layoverNightlyRate: z.coerce.number().min(0).max(2000),
    // TONU
    tonuAmount: z.coerce.number().min(0).max(100000),
    // Accessorial
    accessorialAmount: z.coerce.number().min(0).max(100000),
    accessorialDescription: z.string().trim().optional(),
    // Evidence
    hasRateConfirmation: z.boolean(),
    hasBol: z.boolean(),
    hasPod: z.boolean(),
    notes: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.chargeType === ChargeType.Detention) {
      v.stops.forEach((s, i) => {
        if (!s.address || s.address.trim().length < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Address required", path: ["stops", i, "address"] });
        }
      });
    } else if (v.chargeType === ChargeType.Layover) {
      if (v.layoverNights <= 0)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter nights", path: ["layoverNights"] });
      if (v.layoverNightlyRate <= 0)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter nightly rate", path: ["layoverNightlyRate"] });
    } else if (v.chargeType === ChargeType.Tonu) {
      if (v.tonuAmount <= 0)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter the TONU amount", path: ["tonuAmount"] });
    } else if (v.chargeType === ChargeType.Accessorial) {
      if (v.accessorialAmount <= 0)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter the amount", path: ["accessorialAmount"] });
    }
  });

export type LoadFormValues = z.infer<typeof loadFormSchema>;

export function emptyLoadForm(freeHours: number, ratePerHour: number): LoadFormValues {
  return {
    referenceNumber: "",
    brokerName: "",
    customerName: "",
    customerPhone: "",
    driverName: "",
    chargeType: ChargeType.Detention,
    freeHours,
    ratePerHour,
    stops: [
      { type: StopType.Pickup, sequence: 1, facilityName: "", address: "", arrivedAt: "", departedAt: "" },
      { type: StopType.Delivery, sequence: 2, facilityName: "", address: "", arrivedAt: "", departedAt: "" },
    ],
    layoverNights: 1,
    layoverNightlyRate: 150,
    tonuAmount: 250,
    accessorialAmount: 150,
    accessorialDescription: "",
    hasRateConfirmation: true,
    hasBol: false,
    hasPod: false,
    notes: "",
  };
}
