/**
 * Auth Service - Authentication business logic
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { UnauthorizedError, ConflictError, ValidationError, NotFoundError } from '../errors/index.js';
import type { AuthUser, UserRole } from '../types/index.js';
import type { RegisterDto, LoginDto, AuthResponse } from '../types/dto.js';

// Demo user for development/demo mode
const DEMO_USER: AuthUser = {
    id: 'demo-user-id',
    orgId: 'demo-org-id',
    email: 'demo@vocalpulse.com',
    firstName: 'Demo',
    lastName: 'User',
    role: 'admin',
};

const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';

export class AuthService {
    /**
     * Register a new user
     */
    async register(data: RegisterDto): Promise<AuthResponse> {
        // Check if email exists
        if (userRepository.emailExists(data.email)) {
            throw new ConflictError('Email already registered');
        }

        // Create or validate organization
        let orgId: string;
        if (data.orgId) {
            const org = organizationRepository.findById(data.orgId);
            if (!org) {
                throw new ValidationError('Invalid organization ID');
            }
            orgId = data.orgId;
        } else if (data.orgName) {
            orgId = organizationRepository.createOrg({ name: data.orgName });
        } else {
            throw new ValidationError('Organization name or ID required');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, 12);

        // Create user
        const userId = userRepository.createUser({
            org_id: orgId,
            email: data.email,
            password_hash: passwordHash,
            first_name: data.firstName,
            last_name: data.lastName,
            role: 'rep',
        });

        // Generate JWT
        const token = this.generateToken(userId);

        return {
            token,
            user: {
                id: userId,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                role: 'rep',
                orgId,
            },
        };
    }

    /**
     * Login with email and password
     */
    async login(data: LoginDto): Promise<AuthResponse> {
        // Check for demo credentials
        if (data.email === 'demo@vocalpulse.com' && data.password === 'demo123') {
            const token = this.generateToken(DEMO_USER.id);
            return {
                token,
                user: {
                    id: DEMO_USER.id,
                    email: DEMO_USER.email,
                    firstName: DEMO_USER.firstName,
                    lastName: DEMO_USER.lastName,
                    role: DEMO_USER.role,
                    orgId: DEMO_USER.orgId,
                },
            };
        }

        // Find user by email
        const user = userRepository.findByEmail(data.email);
        if (!user) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Verify password
        const validPassword = await bcrypt.compare(data.password, user.password_hash);
        if (!validPassword) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // Update last login
        userRepository.updateLastLogin(user.id);

        // Generate JWT
        const token = this.generateToken(user.id);

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                orgId: user.org_id,
            },
        };
    }

    /**
     * Validate JWT token and return user
     */
    validateToken(token: string): AuthUser {
        try {
            const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };

            // Check for demo user
            if (decoded.userId === DEMO_USER.id) {
                return DEMO_USER;
            }

            // Find real user
            const user = userRepository.findById(decoded.userId);
            if (!user) {
                throw new UnauthorizedError('User not found');
            }

            return {
                id: user.id,
                orgId: user.org_id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
            };
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new UnauthorizedError('Invalid token');
            }
            if (error instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedError('Token expired');
            }
            throw error;
        }
    }

    /**
     * Get current user by ID
     */
    getCurrentUser(userId: string): AuthUser {
        // Check for demo user
        if (userId === DEMO_USER.id) {
            return DEMO_USER;
        }

        const user = userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User');
        }

        return {
            id: user.id,
            orgId: user.org_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
        };
    }

    /**
     * Check if demo mode is enabled
     */
    isDemoMode(): boolean {
        return DEMO_MODE;
    }

    /**
     * Get demo user (for middleware bypass)
     */
    getDemoUser(): AuthUser {
        return DEMO_USER;
    }

    /**
     * Generate JWT token
     */
    private generateToken(userId: string): string {
        return jwt.sign({ userId }, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
        });
    }
}

// Singleton instance
export const authService = new AuthService();
