export interface Contact {
    id: string;
    full_name: string;
    email: string;
    topic?: string;
    message: string;
    status: 'new' | 'read' | 'replied';
    created_at: string;
    updated_at?: string;
}
