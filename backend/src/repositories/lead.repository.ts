import { Lead, ILead } from '../models/Lead.js';

export class LeadRepository {

    async findById(id: string): Promise<ILead | null> {
        return Lead.findById(id);
    }

    async findAll(conditions: any = {}): Promise<ILead[]> {
        return Lead.find(conditions).sort({ createdAt: -1 });
    }

    async findPaginated(conditions: any = {}, options: any = {}) {
        const page = options.page || 1;
        const limit = options.limit || 50;
        const skip = (page - 1) * limit;

        const total = await Lead.countDocuments(conditions);
        const data = await Lead.find(conditions)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async create(data: Partial<ILead>): Promise<string> {
        const lead = await Lead.create(data);
        return lead.id;
    }

    async update(id: string, data: Partial<ILead>): Promise<boolean> {
        const result = await Lead.findByIdAndUpdate(id, data);
        return !!result;
    }

    async delete(id: string): Promise<boolean> {
        // Soft delete
        const result = await Lead.findByIdAndUpdate(id, { deletedAt: new Date() });
        return !!result;
    }

    async count(conditions: any = {}): Promise<number> {
        return Lead.countDocuments(conditions);
    }
}

export const leadRepository = new LeadRepository();
