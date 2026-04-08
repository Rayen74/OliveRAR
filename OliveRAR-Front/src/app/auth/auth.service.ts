import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
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
  token?: string;
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
  private readonly tokenStorageKey = 'token';
  private readonly userStorageKey = 'user';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials);
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData);
  }

  setSession(token: string, user: User): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(this.tokenStorageKey, token);
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(this.tokenStorageKey);
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  getConnectedUser(): User | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const user = localStorage.getItem(this.userStorageKey);
    return user ? JSON.parse(user) as User : null;
  }

  clearSession(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.userStorageKey);
  }
}
