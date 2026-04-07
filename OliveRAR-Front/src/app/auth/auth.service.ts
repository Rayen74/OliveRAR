import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum Role {
  RESPONSABLE_COOPERATIVE = 'RESPONSABLE_COOPERATIVE',
  RESPONSABLE_LOGISTIQUE = 'RESPONSABLE_LOGISTIQUE',
  AGRICULTEUR = 'AGRICULTEUR',
  RESPONSABLE_CHEF_RECOLTE = 'RESPONSABLE_CHEF_RECOLTE'
}

export interface User {
  id?: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: Role;
}

export interface AuthResponse {
  user?: User;
  message?: string;
  success?: boolean;
  id?: string; // Automatically created id
  [key: string]: any; // Allow other fields for flexibility
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials);
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData);
  }
}
