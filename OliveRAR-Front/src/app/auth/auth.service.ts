import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiResponse } from '../shared/models/api-response.model';
import { API_PREFIX } from '../shared/config/api.config';

export enum Role {
  RESPONSABLE_COOPERATIVE = 'RESPONSABLE_COOPERATIVE',
  RESPONSABLE_LOGISTIQUE = 'RESPONSABLE_LOGISTIQUE',
  AGRICULTEUR = 'AGRICULTEUR',
  RESPONSABLE_CHEF_RECOLTE = 'RESPONSABLE_CHEF_RECOLTE',
  OUVRIER = 'OUVRIER'
}

export interface User {
  id?: string;
  nom: string;
  prenom: string;
  email: string;
  phoneNumber: string;
  imageUrl?: string;
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
  phoneNumber: string;
  password: string;
  role: Role;
}

export interface AuthResponse extends ApiResponse<User> {
  token?: string;
  id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${API_PREFIX}/auth`;
  private readonly tokenStorageKey = 'token';
  private readonly userStorageKey = 'user';
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();
  // Signal pour indiquer quand la session (token/user) est restauree depuis le localStorage.
  // Utile pour eviter que les composants ne chargent des donnees avant d'etre authentifies.
  private readonly sessionReadySubject = new BehaviorSubject<boolean>(false);
  readonly sessionReady$ = this.sessionReadySubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Dans Angular SSR, le code s'execute deux fois : une sur le serveur, une sur le navigateur.
    // localStorage n'existe QUE sur le navigateur. On verifie donc isPlatformBrowser.
    if (isPlatformBrowser(this.platformId)) {
      const user = localStorage.getItem(this.userStorageKey);
      if (user) {
        // Restauration du sujet de l'utilisateur connecte depuis la memoire du navigateur
        this.currentUserSubject.next(JSON.parse(user) as User);
      }
      // On informe le reste de l'application que la session (et le token) sont prets a l'emploi
      this.sessionReadySubject.next(true);
    }
  }

  /**
   * Authenticates a user with email and password.
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials);
  }

  /**
   * Registers a new user.
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData);
  }

  /**
   * Sends a password reset email.
   */
  forgotPassword(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Resets the password using a valid token.
   */
  resetPassword(token: string, password: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/reset-password`, { token, password });
  }

  /**
   * Validates a password reset token.
   */
  validateResetToken(token: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/validate-reset-token`, { params: { token } });
  }

  setSession(token: string, user: User): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(this.tokenStorageKey, token);
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  updateConnectedUser(user: User): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
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
    return this.currentUserSubject.value;
  }

  clearSession(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.userStorageKey);
    this.currentUserSubject.next(null);
  }

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.userStorageKey);
    this.currentUserSubject.next(null);
  }
}
