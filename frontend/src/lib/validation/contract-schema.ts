import { z } from 'zod';

export const contractSchema = z.object({
  employerName: z.string().min(2, { message: "Employer name must be at least 2 characters." }),
  employeeName: z.string().min(1, { message: "Employee name is required." }),
  jobTitle: z.string().min(1, { message: "Job title is required." }),
  jobDescription: z.string().optional(),
  startDate: z.string().min(1, { message: "Start date is required." }),
  hasInitialTerm: z.boolean().default(false),
  hasNoEndDate: z.boolean().default(false),
  onSitePresence: z.string().optional(),
  salary: z.string().min(1, { message: "Salary is required." }),
  benefits: z.object({
    health: z.boolean().default(false),
    dental: z.boolean().default(false),
    vacationSick: z.boolean().default(false),
    parking: z.boolean().default(false),
    profitSharing: z.boolean().default(false),
    fourZeroOneK: z.boolean().default(false),
    paidBarMembership: z.boolean().default(false),
    clePaid: z.boolean().default(false),
    cellPhone: z.boolean().default(false),
  }).optional(),
  otherBenefits: z.string().optional(),
  includeNda: z.boolean().default(false),
  includeNonCompetition: z.boolean().default(false),
  attyInNotice: z.boolean().default(false),
  prose: z.string().optional(),
});

export type ContractFormData = z.infer<typeof contractSchema>; 