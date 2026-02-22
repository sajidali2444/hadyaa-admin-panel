import { z } from "zod";
import type { Address } from "@/types/api";

export const createProjectFormSchema = z
  .object({
    npoUserId: z.string().min(1, "NPO owner is required"),
    title: z
      .string()
      .min(1, "Project title is required")
      .max(200, "Project title must be at most 200 characters"),
    categoryId: z.string().min(1, "Category is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional().default(""),
    description: z
      .string()
      .min(1, "Description is required")
      .max(4000, "Description must be at most 4000 characters"),
    targetAmount: z
      .string()
      .min(1, "Target amount is required")
      .refine((value) => Number(value) > 0, "Target amount must be greater than 0"),
    currency: z
      .string()
      .min(1, "Currency is required")
      .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter code (for example, USD)"),
    country: z.string().optional().default(""),
    state: z.string().optional().default(""),
    city: z.string().optional().default(""),
  })
  .superRefine((values, context) => {
    if (values.endDate && values.startDate && values.endDate < values.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date",
      });
    }

    const hasAnyAddress =
      values.country.trim().length > 0 ||
      values.state.trim().length > 0 ||
      values.city.trim().length > 0;

    if (hasAnyAddress) {
      if (!values.country.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["country"],
          message: "Country is required when address is provided",
        });
      }

      if (!values.state.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["state"],
          message: "State is required when address is provided",
        });
      }

      if (!values.city.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["city"],
          message: "City is required when address is provided",
        });
      }
    }
  });

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

export function toProjectAddresses(values: CreateProjectFormValues): Address[] {
  const country = values.country.trim();
  const state = values.state.trim();
  const city = values.city.trim();

  if (!country && !state && !city) {
    return [];
  }

  return [
    {
      country,
      state,
      city,
    },
  ];
}
