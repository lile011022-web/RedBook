export const COMPLIANCE_THRESHOLDS = {
  titleSimilarity: 0.7,
  bodySimilarity: 0.6
} as const;

export const DRAFT_REVIEW_STATUS = {
  needsReview: "needs_review",
  approved: "approved",
  rejected: "rejected"
} as const;

export const PUBLISH_TASK_STATUS = {
  scheduled: "scheduled",
  due: "due",
  completed: "completed",
  cancelled: "cancelled"
} as const;
