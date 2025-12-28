import { UserProfile } from './user';

export interface Review {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
    comment?: string;
    created_at: string;

    user?: UserProfile;
}

export interface ReviewStats {
    total: number;
    average: number;
    distribution: Record<string, number>;
}

export interface ReviewResponse {
    data: Review[];
    meta: ReviewStats;
}
