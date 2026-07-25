import mongoose, { Schema, Document, Model } from "mongoose";

export interface LeadDocument extends Document {
  fullName: string;
  businessName?: string;
  leadType?: string;
  phone?: string;
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

  isDeleted?: boolean;
  deletedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const leadSchema: Schema<LeadDocument> = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    businessName: { type: String, trim: true },
    leadType: { type: String, trim: true },
    phone: { type: String, trim: true },
    emails: [{ type: String, trim: true, lowercase: true }],
    address: { type: String, trim: true },
    category: { type: String, trim: true },
    alternatePhone: { type: String, trim: true },

    source: { type: String, required: true, trim: true },
    status: { type: String, required: true, trim: true },
    rating: { type: Number },

    website: { type: String, trim: true },
    gmbLink: { type: String, trim: true },
    socials: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true },
      youtube: { type: String, trim: true },
    },

    service: { type: String, trim: true },
    budget: { type: String, trim: true },
    timeline: { type: String, trim: true },
    assignedTo: { type: String, trim: true },
    followUpDate: { type: String },
    followUpTime: { type: String },
    priority: { type: String, trim: true },
    contactMethod: { type: String, trim: true },
    requirements: { type: String, trim: true },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

// Define indexes for performance and rapid query times
leadSchema.index({ fullName: "text", category: "text", address: "text", service: "text" });
leadSchema.index({ status: 1 });
leadSchema.index({ category: 1 });
leadSchema.index({ gmbLink: 1 }, { unique: true, sparse: true });
leadSchema.index({ phone: 1 });

const Lead: Model<LeadDocument> =
  mongoose.models.Lead || mongoose.model<LeadDocument>("Lead", leadSchema);

export default Lead;
