export type Role = 'USER' | 'ADMIN' | 'STAFF';

export interface UserProfile {
    id: string;
    email: string;
    full_name?: string; // or first_name / last_name based on DB
    phone?: string;
    phone_number?: string;
    role: Role;
    avatar_url?: string;
    province?: string;
    district?: string;
    ward?: string;
    street_address?: string;
    created_at: string;
}

export interface AuthSession {
    access_token: string;
    refresh_token: string;
    user: UserProfile;
}
