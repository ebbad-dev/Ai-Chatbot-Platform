/**
 * Type definitions for PrintEZ Staff AI Knowledge & FAQ Management Portal
 */

export enum UnansweredQuestionStatus {
  NEW = 'new',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ResolutionType {
  APPROVED_FAQ = 'approved_faq',
  EXISTING_DOC = 'existing_doc',
  OUT_OF_SCOPE = 'out_of_scope',
}

export enum FaqStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export interface UnansweredQuestion {
  id: string;
  chatbotId: string;
  questionText: string;
  occurrenceCount: number;
  firstAskedAt: string;
  lastAskedAt: string;
  status: UnansweredQuestionStatus;
  resolutionType?: ResolutionType;
  resolvedSourceUrl?: string;
  resolvedFaqId?: string;
}

export interface Faq {
  id: string;
  chatbotId: string;
  question: string;
  answer: string;
  status: FaqStatus;
  sourceUrl?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolveQuestionPayload {
  resolutionType: ResolutionType;
  createFaqAnswer?: string;
  resolvedSourceUrl?: string;
  approvedBy?: string;
}

export interface DashboardStats {
  totalUnanswered: number;
  pendingReview: number;
  totalApprovedFaqs: number;
  aiResolutionScore: number; // e.g. 94.8%
}
