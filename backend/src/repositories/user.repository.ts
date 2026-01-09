import { User, IUser } from '../models/User.js';
import { Organization } from '../models/Organization.js';

export class UserRepository {

    async findByEmail(email: string): Promise<IUser | null> {
        return User.findOne({ email, isActive: true });
    }

    async findById(id: string): Promise<IUser | null> {
        return User.findById(id);
    }

    async findByOrgId(orgId: string, activeOnly: boolean = true): Promise<IUser[]> {
        const query: any = { orgId };
        if (activeOnly) {
            query.isActive = true;
        }
        return User.find(query).sort({ firstName: 1, lastName: 1 });
    }

    async findRepsByOrgId(orgId: string): Promise<IUser[]> {
        return User.find({
            orgId,
            role: 'rep',
            isActive: true
        }).sort({ leadAssignmentWeight: -1 });
    }

    async createUser(data: Partial<IUser>): Promise<string> {
        const user = await User.create(data);
        return user.id;
    }

    async updateLastLogin(userId: string): Promise<void> {
        await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
    }

    async emailExists(email: string): Promise<boolean> {
        const count = await User.countDocuments({ email });
        return count > 0;
    }

    async findWithOrg(userId: string): Promise<any | null> {
        const user = await User.findById(userId).lean();
        if (!user) return null;

        const org = await Organization.findById(user.orgId).lean();

        return {
            ...user,
            org_name: org?.name,
            org_slug: org?.slug
        };
    }
}

export const userRepository = new UserRepository();
