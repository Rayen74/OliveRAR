import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role, User } from '../../../auth/auth.service';

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
  user?: ManagedUser;
}

export interface CreateManagedUserPayload {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: Exclude<Role, Role.RESPONSABLE_COOPERATIVE>;
}

export interface UpdateManagedUserPayload {
  nom: string;
  prenom: string;
  email: string;
  password?: string;
  role: Exclude<Role, Role.RESPONSABLE_COOPERATIVE>;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly apiUrl = 'http://localhost:8080/api/users';

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

  create(payload: CreateManagedUserPayload): Observable<UserMutationResponse> {
    return this.http.post<UserMutationResponse>(this.apiUrl, payload);
  }

  update(id: string, payload: UpdateManagedUserPayload): Observable<UserMutationResponse> {
    return this.http.put<UserMutationResponse>(`${this.apiUrl}/${id}`, payload);
  }

  delete(id: string): Observable<UserMutationResponse> {
    return this.http.delete<UserMutationResponse>(`${this.apiUrl}/${id}`);
  }
}
