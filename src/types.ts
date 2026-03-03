export type UserRole = 'admin' | 'sale';

export interface Lead {
  id: string;
  customerName: string;
  phoneNumber: string;
  dob?: string; // YYYY-MM-DD
  tourInterest: string;
  tourPrice?: number;
  discountPrice?: number;
  amountCollected?: number;
  paymentDueDate?: string; // YYYY-MM-DD
  documentStatus?: 'Chưa thu' | 'Đã thu một phần' | 'Đã đủ';
  documentDueDate?: string; // YYYY-MM-DD
  source: 'Facebook' | 'Zalo' | 'Other';
  status: 'New' | 'Potential' | 'Closed' | 'Lost';
  resaleCount: number; // 1-3
  notes: string;
  assignedTo?: string; // ID of the sale person
  createdAt: string;
  updatedAt: string;
  expectedProfit?: number;
  actualProfit?: number;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  email?: string;
  role: 'admin' | 'sale';
  assignedTours: string[];
}

export interface Tour {
  id: string;
  name: string;
  description?: string;
  price?: number;
  createdAt: string;
}

export interface TourCost {
  tourName: string;
  marketingCost: number;
  period: string; // e.g., "2024-02"
}

export interface MarketingReport {
  tourName: string;
  totalLeads: number;
  closedLeads: number;
  totalMarketingCost: number;
  totalProfit: number;
  roi: number;
}
