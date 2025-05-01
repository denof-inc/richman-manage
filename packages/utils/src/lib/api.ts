/**
 * API client utilities for RichmanManage
 */

export type ApiResponse<T> = {
  data?: T;
  error?: string;
};

/**
 * Wrapper for fetch API with error handling
 */
export async function fetchWrapper<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || 'Something went wrong',
      };
    }

    return { data: data as T };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
