export interface LeadFormData {
  _id?: string;

  fullName: string;
  businessName?: string;
  leadType?: string;
  phone: string;
  emails?: string[];
  address?: string;
  category?: string;
  alternatePhone?: string;

  source: string;
  status: string;
  rating?: number;

  website?: string;
  gmbLink?: string;
  socials?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
  
  service?: string;
  budget?: string;
  timeline?: string;
  assignedTo?: string;
  followUpDate?: string;
  followUpTime?: string;
  priority?: string;
  contactMethod?: string;
  requirements?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type LeadPayload = Omit<LeadFormData, "_id" | "createdAt" | "updatedAt">;
