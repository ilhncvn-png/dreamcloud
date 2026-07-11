export interface WaitlistEntry {
  id: string;
  email: string;
  isContacted: boolean;
  contactedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface WaitlistPage {
  items: WaitlistEntry[];
  total: number;
  page: number;
  pages: number;
}
