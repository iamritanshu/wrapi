import { BaseEntity } from './index';

export interface Account extends BaseEntity {
    accountId: string;
    name: string;
    status?: 'active' | 'inactive';
}
