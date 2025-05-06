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
  // Zorg ervoor dat Firebase auth volledig is geïnitialiseerd
  let headers: Record<string, string> = {};
  
  try {
    const { getAuthToken, waitForAuthInit } = await import('./firebase');
    
    // Wacht eerst tot de Firebase auth is geïnitialiseerd
    await waitForAuthInit();
    
    // Haal dan het token op
    const token = await getAuthToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Firebase auth token succesvol toegevoegd aan verzoek:', url);
    } else {
      console.warn('Geen Firebase auth token beschikbaar voor verzoek:', url);
      
      // Dit is belangrijke debugging informatie - we willen weten waarom er geen token is
      const { auth } = await import('./firebase');
      const currentUser = auth.currentUser;
      console.log('Huidige auth.currentUser status:', currentUser ? 'ingelogd' : 'uitgelogd');
      
      // Als er geen token is maar wel een gebruiker, probeer opnieuw een token te krijgen
      if (currentUser) {
        try {
          console.log('Proberen token handmatig op te halen van currentUser...');
          const freshToken = await currentUser.getIdToken(true);  // forceer vernieuwen
          if (freshToken) {
            headers['Authorization'] = `Bearer ${freshToken}`;
            console.log('Token handmatig opgehaald en toegevoegd aan verzoek');
          }
        } catch (tokenError) {
          console.error('Fout bij handmatig ophalen token:', tokenError);
        }
      }
    }
  } catch (error) {
    console.error('Fout bij Firebase auth token ophalen:', error);
  }
  
  // Voeg Content-Type header toe als er data is
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (fetchError) {
    console.error(`Fout bij ${method} verzoek naar ${url}:`, fetchError);
    throw fetchError;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Zorg ervoor dat Firebase auth volledig is geïnitialiseerd
    let headers: Record<string, string> = {};
    const url = queryKey[0] as string;
    
    try {
      const { getAuthToken, waitForAuthInit } = await import('./firebase');
      
      // Wacht eerst tot de Firebase auth is geïnitialiseerd
      await waitForAuthInit();
      
      // Haal dan het token op
      const token = await getAuthToken();
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Firebase auth token succesvol toegevoegd aan query:', url);
      } else {
        console.warn('Geen Firebase auth token beschikbaar voor query:', url);
        
        // Dit is belangrijke debugging informatie - we willen weten waarom er geen token is
        const { auth } = await import('./firebase');
        const currentUser = auth.currentUser;
        console.log('Huidige auth.currentUser status voor query:', currentUser ? 'ingelogd' : 'uitgelogd');
        
        // Als er geen token is maar wel een gebruiker, probeer opnieuw een token te krijgen
        if (currentUser) {
          try {
            console.log('Proberen token handmatig op te halen van currentUser voor query...');
            const freshToken = await currentUser.getIdToken(true);  // forceer vernieuwen
            if (freshToken) {
              headers['Authorization'] = `Bearer ${freshToken}`;
              console.log('Token handmatig opgehaald en toegevoegd aan query');
            }
          } catch (tokenError) {
            console.error('Fout bij handmatig ophalen token voor query:', tokenError);
          }
        }
      }
    } catch (error) {
      console.error('Fout bij Firebase auth token ophalen voor query:', error);
    }
    
    try {
      const res = await fetch(url, {
        headers,
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn('Query ontving een 401 Unauthorized. Actie:', unauthorizedBehavior);
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (fetchError) {
      console.error(`Fout bij GET query naar ${url}:`, fetchError);
      throw fetchError;
    }
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
