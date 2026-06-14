export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    timestamp: string;
    cursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}
