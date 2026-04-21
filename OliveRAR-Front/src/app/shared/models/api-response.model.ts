export interface ApiResponse<T = any> {
  data?: T;
  user?: T; // Some endpoints return user object at root
  message?: string;
  success?: boolean;
  status?: number;
}
