import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role, User } from '../../../auth/auth.service';
import { API_PREFIX } from '../../../shared/config/api.config';

export interface ManagedUser extends User {
  id: string;
}

export interface UsersResponse {
  success: boolean;
  users: ManagedUser[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserMutationResponse {
  success: boolean;
  message: string;
  data?: ManagedUser;
  user?: ManagedUser;
  url?: string;
}

export interface UserDetailsResponse {
  success: boolean;
  data?: ManagedUser;
  user: ManagedUser;
}

export interface CreateManagedUserPayload {
  nom: string;
  prenom: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: Exclude<Role, Role.RESPONSABLE_COOPERATIVE>;
}

export interface UpdateManagedUserPayload {
  nom: string;
  prenom: string;
  email: string;
  phoneNumber: string;
  password?: string;
  role: Exclude<Role, Role.RESPONSABLE_COOPERATIVE>;
}

export interface UpdateProfilePayload {
  nom: string;
  prenom: string;
  email: string;
  phoneNumber: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly apiUrl = `${API_PREFIX}/users`;

  constructor(private http: HttpClient) { }

  getAll(page = 0, size = 7, name?: string, role?: string): Observable<UsersResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    if (name?.trim()) {
      params = params.set('name', name.trim());
    }

    if (role) {
      params = params.set('role', role);
    }

    return this.http.get<UsersResponse>(this.apiUrl, { params });
  }

  getById(id: string): Observable<UserDetailsResponse> {
    return this.http.get<UserDetailsResponse>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateManagedUserPayload): Observable<UserMutationResponse> {
    return this.http.post<UserMutationResponse>(this.apiUrl, payload);
  }

  update(id: string, payload: UpdateManagedUserPayload): Observable<UserMutationResponse> {
    return this.http.put<UserMutationResponse>(`${this.apiUrl}/${id}`, payload);
  }

  updateProfile(id: string, payload: UpdateProfilePayload): Observable<UserMutationResponse> {
    return this.http.put<UserMutationResponse>(`${this.apiUrl}/${id}/profile`, payload);
  }

  uploadPhoto(id: string, file: File): Observable<UserMutationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UserMutationResponse>(`${this.apiUrl}/${id}/upload-photo`, formData);
  }

  delete(id: string): Observable<UserMutationResponse> {
    return this.http.delete<UserMutationResponse>(`${this.apiUrl}/${id}`);
  }
}
