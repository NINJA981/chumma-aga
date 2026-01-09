import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
    orgId: string;
    assignedTo?: string;
    firstName: string;
    lastName?: string;
    phone: string;
    email?: string;
    company?: string;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
    notes?: string;
    source?: string;
    optimalCallHour?: number;
    optimalCallDay?: number;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const LeadSchema = new Schema<ILead>({
    orgId: { type: String, required: true, index: true },
    assignedTo: { type: String, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    phone: { type: String, required: true, index: true },
    email: { type: String },
    company: { type: String },
    status: {
        type: String,
        enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
        default: 'new',
        index: true
    },
    notes: { type: String },
    source: { type: String },
    optimalCallHour: { type: Number },
    optimalCallDay: { type: Number },
    deletedAt: { type: Date }
}, {
    timestamps: true
});

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
