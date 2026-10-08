// הצורות שהמסך מקבל מה API. משותף למצב דמו ולמצב אמיתי.

export type StepStats = {
  sent: number; delivered: number; opened: number; clicked: number;
  bounced: number; complained: number; unsubscribed: number;
};

export type SeqStep = {
  id: string;
  channel: "email";
  subject: string;
  delay: string;
  trigger: string;
  preview: string;
  sent: number | null;
  html?: string | null;
  stats?: StepStats | null;
  unsubReq?: number;
};

export type Sequence = {
  id: string;
  kind: "sequence" | "broadcast";
  name: string;
  audienceLabel: string;
  description: string;
  steps: SeqStep[];
  totalLeads: number;
  pendingLeads: number;
};

export type ScheduledEmail = {
  id: string;
  subject: string;
  dueAt: string;
  status: "scheduled" | "sent";
  preview?: string;
  html?: string | null;
  audienceLabel?: string;
};

export type Contact = { email: string; name?: string | null; phone?: string | null; at: string | null; link?: string | null };
