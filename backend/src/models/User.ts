import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    orgId: string; // Stored as string to match existing logic, or ObjectId if we refactor IDs
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'manager' | 'rep';
    isActive: boolean;
    leadAssignmentWeight: number;
    avatarUrl?: string;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    orgId: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'rep'], default: 'rep' },
    isActive: { type: Boolean, default: true },
    leadAssignmentWeight: { type: Number, default: 1 },
    avatarUrl: { type: String },
    lastLoginAt: { type: Date }
}, {
    timestamps: true
});

export const User = mongoose.model<IUser>('User', UserSchema);
