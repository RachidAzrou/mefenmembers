import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { MemberRequest } from "@shared/schema";

export function usePendingRequests() {
  const { data, isLoading, error } = useQuery<MemberRequest[]>({
    queryKey: ["/api/member-requests"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 2, // 2 minutes
  });

  // Tel alleen aanvragen met status "pending"
  const pendingCount = !isLoading && !error && data 
    ? data.filter(request => request.status === "pending").length 
    : 0;

  return {
    pendingCount,
    isLoading,
    error
  };
}