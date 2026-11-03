import useSWR from 'swr';
import { useAuth } from '../components/providers/AuthProvider';
import { API_URL } from '../services/base-http';
import { AnalyticsError, fetchAnalytics } from '../lib/analytics';

export function useAnalytics(range: string = '7d') {
    const { session, loading: authLoading } = useAuth();

    const { data, error, isLoading, mutate } = useSWR(
        session ? [`${API_URL}/analytics/dashboard?range=${range}`, session.access_token] : null,
        ([url, token]) => fetchAnalytics(url, token)
    );

    return {
        data,
        isLoading: authLoading || isLoading,
        error: error || (!authLoading && !session ? new Error('Vui lòng đăng nhập để xem thống kê.') : undefined),
        isUnauthenticated: (!authLoading && !session) || (error instanceof AnalyticsError && error.status === 401),
        retry: () => mutate(),
    };
}
