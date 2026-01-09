import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
    callyzerId?: string;
    orgId: string;
    repId: string;
    leadId?: string;
    phoneNumber: string;
    callType: 'inbound' | 'outbound';
    callSource: 'voip' | 'sim' | 'manual';
    startedAt: Date;
    endedAt?: Date;
    durationSeconds: number;
    isAnswered: boolean;
    disposition?: string;
    recordingUrl?: string;
    transcript?: string;
    notes?: string;
    xpAwarded: number;
    // Analysis (Embedded)
    analysis?: {
        sentimentScore?: number;
        sentimentLabel?: string;
        summary?: string;
        summaryBullets?: string[];
        actionItems?: string[];
        keywords?: string[];
        topics?: string[];
        nextActionDate?: Date;
    };
    createdAt: Date;
}

const CallSchema = new Schema<ICall>({
    callyzerId: { type: String, unique: true, sparse: true },
    orgId: { type: String, required: true, index: true },
    repId: { type: String, required: true, index: true },
    leadId: { type: String, index: true },
    phoneNumber: { type: String, required: true },
    callType: { type: String, enum: ['inbound', 'outbound'], default: 'outbound' },
    callSource: { type: String, enum: ['voip', 'sim', 'manual'], default: 'manual' },
    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    isAnswered: { type: Boolean, default: false },
    disposition: { type: String },
    recordingUrl: { type: String },
    transcript: { type: String },
    notes: { type: String },
    xpAwarded: { type: Number, default: 0 },
    analysis: {
        sentimentScore: Number,
        sentimentLabel: String,
        summary: String,
        summaryBullets: [String],
        actionItems: [String],
        keywords: [String],
        topics: [String],
        nextActionDate: Date
    }
}, {
    timestamps: true
});

export const Call = mongoose.model<ICall>('Call', CallSchema);
