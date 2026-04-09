import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { Role } from '../../../auth/auth.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, switchMap, tap } from 'rxjs/operators';
import {
  CreateManagedUserPayload,
  ManagedUser,
  UserMutationResponse,
  UpdateManagedUserPayload,
  UsersService
} from './users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './users.html'
})
export class UsersComponent implements OnInit {
  // Trigger pour rafraîchir la liste via le pipe async
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  usersData$: Observable<any> | undefined;

  isLoading = false;
  isSubmitting = false;
  editingUserId: string | null = null;
  error = '';

  // Pagination
  currentPage = 0;
  pageSize = 7;
  totalPages = 1;
  totalElements = 0;

  // Modales et Toasts
  isDeleteModalOpen = false;
  userToDelete: ManagedUser | null = null;
  toast = { message: '', type: 'success' as 'success' | 'error', show: false };

  userForm: FormGroup;
  filterForm: FormGroup;
  readonly roleFilterOptions: Array<Exclude<Role, Role.RESPONSABLE_COOPERATIVE>> = [
    Role.AGRICULTEUR,
    Role.RESPONSABLE_LOGISTIQUE,
    Role.RESPONSABLE_CHEF_RECOLTE
  ];
  readonly manageableRoles: Array<Exclude<Role, Role.RESPONSABLE_COOPERATIVE>> = [
    Role.AGRICULTEUR,
    Role.RESPONSABLE_LOGISTIQUE,
    Role.RESPONSABLE_CHEF_RECOLTE
  ];

  // Password validation methods
  getPasswordValidationErrors(password: string): string[] {
    const errors: string[] = [];

    if (!password) return errors;

    if (password.length < 8) {
      errors.push('Au moins 8 caractères');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Au moins un chiffre');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Au moins une lettre majuscule');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Au moins une lettre minuscule');
    }

    if (!/[@#$%^&+=!*?]/.test(password)) {
      errors.push('Au moins un caractère spécial (@#$%^&+=!*?)');
    }

    return errors;
  }

  get passwordErrors(): string[] {
    const passwordValue = this.userForm.get('password')?.value || '';
    return this.getPasswordValidationErrors(passwordValue);
  }

  get isPasswordValid(): boolean {
    return this.passwordErrors.length === 0 && (this.userForm.get('password')?.value?.length > 0);
  }

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService
  ) {
    // Initialisation sans validateurs (tout est géré par le Backend)
    this.userForm = this.fb.group({
      nom: [''],
      prenom: [''],
      email: [''],
      password: [''],
      role: [Role.AGRICULTEUR]
    });

    this.filterForm = this.fb.group({
      searchName: [''],
      searchRole: ['']
    });
  }

  ngOnInit(): void {
    this.usersData$ = this.refreshTrigger$.pipe(
      tap(() => {
        this.isLoading = true;
        this.error = '';
      }),
      switchMap(() =>
        this.usersService
          .getAll(
            this.currentPage,
            this.pageSize,
            this.filterForm.get('searchName')?.value,
            this.filterForm.get('searchRole')?.value
          )
          .pipe(
            catchError((err) => {
              this.error = "Impossible de charger la liste.";
              return of({ users: [], totalElements: 0, totalPages: 1 });
            })
          )
      ),
      tap((response) => {
        this.totalElements = response.totalElements ?? 0;
        this.totalPages = Math.max(1, response.totalPages ?? 1);
        this.isLoading = false;
      })
    );
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.refreshTrigger$.next();
  }

  submitUserForm(): void {
    this.isSubmitting = true;
    this.error = '';

    const payload = this.userForm.getRawValue();

    // Validate password for create operations or when password is provided for updates
    const password = payload.password;
    if (!this.editingUserId && (!password || !this.isPasswordValid)) {
      // Creating new user - password is required and must be valid
      this.showNotification('Le mot de passe ne respecte pas les critères de sécurité.', 'error');
      this.isSubmitting = false;
      return;
    }

    if (this.editingUserId && password && !this.isPasswordValid) {
      // Updating user with new password - must be valid if provided
      this.showNotification('Le mot de passe ne respecte pas les critères de sécurité.', 'error');
      this.isSubmitting = false;
      return;
    }

    const request$ = this.editingUserId
      ? this.usersService.update(this.editingUserId, payload as UpdateManagedUserPayload)
      : this.usersService.create(payload as CreateManagedUserPayload);

    request$.pipe(finalize(() => this.isSubmitting = false)).subscribe({
      next: (response: UserMutationResponse) => {
        if (response.success) {
          this.showNotification(response.message, 'success');
          this.resetUI();
          this.refreshTrigger$.next();
        }
      },
      error: (err) => {
        // Affiche l'erreur renvoyée par validatePassword ou autre contrainte Backend
        const msg = err?.error?.message || 'Une erreur est survenue';
        this.showNotification(msg, 'error');
        this.error = msg;
      }
    });
  }

  startEdit(user: ManagedUser): void {
    this.editingUserId = user.id;
    this.userForm.patchValue({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      password: '', // On laisse vide : si l'admin n'y touche pas, le backend ignore le champ
      role: user.role
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteUser(user: ManagedUser): void {
    this.userToDelete = user;
    this.isDeleteModalOpen = true;
  }

  confirmDelete(): void {
    if (!this.userToDelete) return;

    this.usersService.delete(this.userToDelete.id).subscribe({
      next: (res) => {
        this.showNotification(res.message, 'success');
        this.cancelDelete();
        this.refreshTrigger$.next();
      },
      error: () => this.showNotification('Erreur lors de la suppression', 'error')
    });
  }

  private resetUI(): void {
    this.editingUserId = null;
    this.userForm.reset({ role: Role.AGRICULTEUR });
  }

  cancelEdit(): void {
    this.resetUI();
  }

  cancelDelete(): void {
    this.isDeleteModalOpen = false;
    this.userToDelete = null;
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type, show: true };
    setTimeout(() => this.toast.show = false, 3000);
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.refreshTrigger$.next();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.refreshTrigger$.next();
    }
  }
}
