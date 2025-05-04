import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    console.error(`Erro na requisição (${res.status}):`, text);
    
    try {
      // Tentar analisar como JSON para mensagens de erro mais detalhadas
      const errorData = JSON.parse(text);
      if (errorData.errors && Array.isArray(errorData.errors)) {
        throw new Error(errorData.errors.map((err: any) => err.message || err).join(", "));
      } else if (errorData.message) {
        throw new Error(errorData.message);
      }
    } catch (jsonError) {
      // Se não for JSON válido, usa o texto bruto
    }
    
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Realizando requisição ${method} para ${url}`, data);
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    console.log(`Requisição ${method} ${url} bem-sucedida`);
    return res;
  } catch (error) {
    console.error(`Falha na requisição ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
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
