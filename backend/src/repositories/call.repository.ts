import { Call, ICall } from '../models/Call.js';

export class CallRepository {

    async create(data: Partial<ICall>): Promise<string> {
        const call = await Call.create(data);
        return call.id;
    }

    async findById(id: string): Promise<ICall | null> {
        return Call.findById(id);
    }

    async findByCallyzerId(callyzerId: string): Promise<ICall | null> {
        return Call.findOne({ callyzerId });
    }

    async update(id: string, data: Partial<ICall>): Promise<boolean> {
        const result = await Call.findByIdAndUpdate(id, data);
        return !!result;
    }

    async findRecent(orgId: string, limit: number = 50): Promise<ICall[]> {
        return Call.find({ orgId })
            .sort({ startedAt: -1 })
            .limit(limit);
    }

    async getStats(orgId: string, timeframe: string = 'today') {
        const now = new Date();
        let start = new Date();

        if (timeframe === 'today') {
            start.setHours(0, 0, 0, 0);
        } else if (timeframe === 'month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        }

        const stats = await Call.aggregate([
            { $match: { orgId, startedAt: { $gte: start } } },
            {
                $group: {
                    _id: null,
                    totalCalls: { $sum: 1 },
                    totalDuration: { $sum: '$durationSeconds' },
                    answered: { $sum: { $cond: ['$isAnswered', 1, 0] } }
                }
            }
        ]);

        return stats[0] || { totalCalls: 0, totalDuration: 0, answered: 0 };
    }
}

export const callRepository = new CallRepository();
