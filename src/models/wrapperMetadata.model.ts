import { BaseEntity } from './index';

export interface WrapperMetadata extends BaseEntity {
    wrapperId: string;
    accountId: string;
    version: number;
    status?: string;
    description?: string;
    createdBy?: string;
}
