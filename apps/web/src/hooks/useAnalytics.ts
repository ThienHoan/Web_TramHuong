import useSWR from 'swr';
import { useAuth } from '../components/providers/AuthProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const fetcher = (url: string, token: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json());

export function useAnalytics(range: string = '7d') {
    const { session } = useAuth();

    const { data, error, isLoading } = useSWR(
        session ? [`${API_URL}/analytics/dashboard?range=${range}`, session.access_token] : null,
        ([url, token]) => fetcher(url, token)
    );

    return {
        data,
        isLoading,
        error
    };
}
