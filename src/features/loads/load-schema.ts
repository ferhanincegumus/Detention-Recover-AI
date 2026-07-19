import { z } from "zod";
import { StopType } from "@/types/load";

const stopSchema = z.object({
  type: z.nativeEnum(StopType),
  sequence: z.number(),
  facilityName: z.string().trim().optional(),
  address: z.string().trim().min(2, "Address required"),
  appointmentAt: z.string().optional(),
  arrivedAt: z.string().optional(),
  departedAt: z.string().optional(),
});

export const loadFormSchema = z.object({
  referenceNumber: z.string().trim().min(2, "Reference required"),
  brokerName: z.string().trim().min(2, "Broker required"),
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
  driverName: z.string().trim().optional(),
  freeHours: z.coerce.number().min(0).max(24),
  ratePerHour: z.coerce.number().min(0).max(1000),
  stops: z.array(stopSchema).min(1, "At least one stop"),
  hasRateConfirmation: z.boolean(),
  hasBol: z.boolean(),
  hasPod: z.boolean(),
  notes: z.string().trim().optional(),
});

export type LoadFormValues = z.infer<typeof loadFormSchema>;

export function emptyLoadForm(freeHours: number, ratePerHour: number): LoadFormValues {
  return {
    referenceNumber: "",
    brokerName: "",
    customerName: "",
    customerPhone: "",
    driverName: "",
    freeHours,
    ratePerHour,
    stops: [
      { type: StopType.Pickup, sequence: 1, facilityName: "", address: "", arrivedAt: "", departedAt: "" },
      { type: StopType.Delivery, sequence: 2, facilityName: "", address: "", arrivedAt: "", departedAt: "" },
    ],
    hasRateConfirmation: true,
    hasBol: false,
    hasPod: false,
    notes: "",
  };
}
