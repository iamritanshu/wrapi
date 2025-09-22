import { BaseEntity } from './index';

export interface User extends BaseEntity {
    userId: string;
    accountId: string;
    email: string;
    role: 'admin' | 'developer' | 'viewer';
}
