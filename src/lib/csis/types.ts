export type TicketStatus = "active" | "waiting" | "on_hold" | "solved" | "closed" | "spam";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketType = "question" | "incident" | "problem" | "task";
export type MessageKind = "customer" | "reply" | "note";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "agent";
  active: boolean;
  signature: string;
};

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  notes: string;
  created_at: string;
};

export type Ticket = {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  source: "email" | "portal" | "agent";
  assignee_id: string | null;
  customer_id: string;
  tags: string[];
  access_token: string;
  first_response_at: string | null;
  solved_at: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  ticket_id: string;
  kind: MessageKind;
  author_id: string | null;
  body: string;
  email_message_id: string | null;
  created_at: string;
};

export type Attachment = {
  id: string;
  message_id: string;
  ticket_id: string;
  filename: string;
  content_type: string;
  size: number;
  storage_path: string;
};

export type TicketEvent = {
  id: string;
  ticket_id: string;
  description: string;
  created_at: string;
};

export type CannedResponse = { id: string; title: string; body: string };

export type Article = {
  id: string;
  title: string;
  slug: string;
  category: string;
  body: string;
  published: boolean;
  updated_at: string;
};
