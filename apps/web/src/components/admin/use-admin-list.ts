"use client";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import useSWR from "swr";
import { useDebouncedCallback } from "use-debounce";
import { useAuth } from "@/components/providers/AuthProvider";
import { API_URL } from "@/services/base-http";
import { AdminRow, Resource } from "./admin-resources";

export interface ListResult {
  data: AdminRow[];
  meta: { page: number; limit: number; total: number; last_page: number };
}
export type ListState = Record<string, string>;
export const initialState: ListState = {
  page: "1",
  limit: "20",
  sort: "created_at:desc",
};
export async function adminFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Phiên đăng nhập đã hết hạn. / Session expired."
        : data?.message || `Không thể thực hiện (${response.status})`,
    );
  return data as T;
}
export function useAdminList(resource: Resource) {
  const locale = useLocale();
  const { session } = useAuth();
  const [state, setState] = useState<ListState>(initialState);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      const params = Object.fromEntries(
        new URLSearchParams(window.location.search),
      );
      const next = { ...initialState, ...params };
      if (!["10", "20", "50"].includes(next.limit)) next.limit = "20";
      if (!/^\d+$/.test(next.page) || Number(next.page) < 1) next.page = "1";
      setState(next);
      setSearch(next.search || "");
      setReady(true);
      setSelected([]);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [resource]);
  const update = useCallback((changes: ListState, replaceAll = false) => {
    setState((previous) => {
      const next: ListState = replaceAll
        ? { ...initialState, ...changes, page: "1" }
        : { ...previous, page: "1", ...changes };
      Object.keys(next).forEach((key) => {
        if (!next[key]) delete next[key];
      });
      const query = new URLSearchParams(next);
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}?${query}`,
      );
      return next;
    });
    setSelected([]);
    if (replaceAll) setSearch(changes.search || "");
  }, []);
  const debouncedSearch = useDebouncedCallback(
    (value: string) => update({ search: value.trim() }),
    350,
  );
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);
  const query = new URLSearchParams({ ...state, locale }).toString();
  const token = session?.access_token || "";
  const result = useSWR<ListResult>(
    ready && token ? [`/admin/resources/${resource}?${query}`, token] : null,
    ([path, accessToken]: [string, string]) =>
      adminFetch<ListResult>(path, accessToken),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      onSuccess: (data) => {
        if (Number(state.page) > data.meta.last_page)
          update({ page: String(data.meta.last_page) });
      },
    },
  );
  return {
    ...result,
    state,
    update,
    search,
    setSearch,
    debouncedSearch,
    selected,
    setSelected,
    query,
    token,
    ready,
    locale,
  };
}
