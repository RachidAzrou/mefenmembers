import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Probeer Firebase auth token op te halen als deze beschikbaar is
  let headers: Record<string, string> = {};
  
  try {
    const { getAuthToken } = await import('./firebase');
    const token = await getAuthToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Firebase auth token succesvol toegevoegd aan verzoek');
    } else {
      console.log('Geen Firebase auth token beschikbaar, verzoek wordt zonder token verzonden');
    }
  } catch (error) {
    console.warn('Kon Firebase auth token niet ophalen:', error);
  }
  
  // Voeg Content-Type header toe als er data is
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Probeer Firebase auth token op te halen als deze beschikbaar is
    let headers: Record<string, string> = {};
    
    try {
      const { getAuthToken } = await import('./firebase');
      const token = await getAuthToken();
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Firebase auth token succesvol toegevoegd aan query');
      } else {
        console.log('Geen Firebase auth token beschikbaar voor query');
      }
    } catch (error) {
      console.warn('Kon Firebase auth token niet ophalen voor query:', error);
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
