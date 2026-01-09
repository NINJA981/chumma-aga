import { Organization, IOrganization } from '../models/Organization.js';

export class OrganizationRepository {

    async findById(id: string): Promise<IOrganization | null> {
        return Organization.findById(id);
    }

    async findBySlug(slug: string): Promise<IOrganization | null> {
        return Organization.findOne({ slug });
    }

    async createOrg(data: { name: string, slug?: string }): Promise<string> {
        const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const org = await Organization.create({
            name: data.name,
            slug
        });
        return org.id;
    }
}

export const organizationRepository = new OrganizationRepository();
