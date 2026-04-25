import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { Role } from '../../../../core/auth/auth.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, switchMap, tap } from 'rxjs/operators';
import {
  CreateManagedUserPayload,
  ManagedUser,
  UserMutationResponse,
  UpdateManagedUserPayload,
  UsersService,
  UsersResponse
} from '../../services/users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './users.html'
})
export class UsersComponent implements OnInit {
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  usersData$: Observable<UsersResponse> | undefined;

  isLoading = false;
  isSubmitting = false;
  showUserForm = false;
  editingUserId: string | null = null;
  error = '';

  currentPage = 0;
  pageSize = 6;
  totalPages = 1;
  totalElements = 0;

  isDeleteModalOpen = false;
  userToDelete: ManagedUser | null = null;
  toast = { message: '', type: 'success' as 'success' | 'error', show: false };

  userForm: FormGroup;
  filterForm: FormGroup;
  readonly roleFilterOptions: Array<Exclude<Role, Role.RESPONSABLE_COOPERATIVE>> = [
    Role.AGRICULTEUR,
    Role.RESPONSABLE_LOGISTIQUE,
    Role.RESPONSABLE_CHEF_RECOLTE,
    Role.OUVRIER
  ];
  readonly manageableRoles: Array<Exclude<Role, Role.RESPONSABLE_COOPERATIVE>> = [
    Role.AGRICULTEUR,
    Role.RESPONSABLE_LOGISTIQUE,
    Role.RESPONSABLE_CHEF_RECOLTE,
    Role.OUVRIER
  ];

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) {
    this.userForm = this.fb.group({
      nom: [''],
      prenom: [''],
      email: [''],
      phoneNumber: [''],
      password: [''],
      role: [Role.AGRICULTEUR]
    });

    this.filterForm = this.fb.group({
      searchName: [''],
      searchRole: ['']
    });
  }

  get passwordErrors(): string[] {
    const passwordValue = this.userForm.get('password')?.value || '';
    return this.getPasswordValidationErrors(passwordValue);
  }

  get isPasswordValid(): boolean {
    return this.passwordErrors.length === 0 && (this.userForm.get('password')?.value?.length > 0);
  }

  get phoneError(): string {
    const phoneNumber = (this.userForm.get('phoneNumber')?.value || '').trim();
    if (!phoneNumber) {
      return '';
    }
    return /^\d{8}$/.test(phoneNumber) ? '' : 'Le numero doit contenir exactement 8 chiffres.';
  }

  /**
   * Complex password validation logic.
   * @param password Raw password string
   */
  getPasswordValidationErrors(password: string): string[] {
    const errors: string[] = [];

    if (!password) {
      return errors;
    }

    if (password.length < 8) {
      errors.push('Au moins 8 caracteres');
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
      errors.push('Au moins un caractere special (@#$%^&+=!*?)');
    }

    return errors;
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
            catchError(() => {
              this.error = 'Impossible de charger la liste.';
              return of({ users: [], totalElements: 0, totalPages: 1, page: 0, size: this.pageSize, success: false, } as UsersResponse);
            })
          )
      ),
      tap((response: UsersResponse) => {
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
    const payload = this.userForm.getRawValue();
    const password = payload.password;

    // Field-by-field validation with toasts
    if (!payload.nom?.trim()) {
      this.showNotification('Le nom est obligatoire.', 'error');
      return;
    }
    if (!payload.prenom?.trim()) {
      this.showNotification('Le prénom est obligatoire.', 'error');
      return;
    }
    if (!payload.email?.trim()) {
      this.showNotification("L'adresse email est obligatoire.", 'error');
      return;
    }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailPattern.test(payload.email)) {
      this.showNotification("L'adresse email doit être au format @gmail.com", 'error');
      return;
    }
    if (!payload.phoneNumber?.trim()) {
      this.showNotification('Le numéro de téléphone est obligatoire.', 'error');
      return;
    }
    if (this.phoneError) {
      this.showNotification(this.phoneError, 'error');
      return;
    }
    if (!payload.role) {
      this.showNotification('Le rôle est obligatoire.', 'error');
      return;
    }

    // Password validation: mandatory for new users, optional for editing
    if (!this.editingUserId) {
      if (!password) {
        this.showNotification('Le mot de passe est obligatoire.', 'error');
        return;
      }
      if (!this.isPasswordValid) {
        this.showNotification('Le mot de passe ne respecte pas les critères de sécurité.', 'error');
        return;
      }
    } else {
      // If editing, only validate password if user entered a new one
      if (password && !this.isPasswordValid) {
        this.showNotification('Le mot de passe ne respecte pas les critères de sécurité.', 'error');
        return;
      }
    }

    this.isSubmitting = true;
    this.error = '';

    const request$ = this.editingUserId
      ? this.usersService.update(this.editingUserId, payload as UpdateManagedUserPayload)
      : this.usersService.create(payload as CreateManagedUserPayload);

    request$.pipe(finalize(() => this.isSubmitting = false)).subscribe({
      next: (response: UserMutationResponse) => {
        if (response.success) {
          this.showNotification(response.message, 'success');
          this.resetUI();
          this.showUserForm = false;
          this.refreshTrigger$.next();
        }
      },
      error: (err) => {
        const msg = err?.error?.message || 'Une erreur est survenue';
        this.showNotification(msg, 'error');
        this.error = msg;
      }
    });
  }

  startEdit(user: ManagedUser): void {
    this.showUserForm = true;
    this.editingUserId = user.id;
    this.userForm.patchValue({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      phoneNumber: user.phoneNumber,
      password: '',
      role: user.role
    });
  }

  openCreateForm(): void {
    this.resetUI();
    this.showUserForm = true;
  }

  deleteUser(user: ManagedUser): void {
    this.userToDelete = user;
    this.isDeleteModalOpen = true;
  }

  confirmDelete(): void {
    if (!this.userToDelete) {
      return;
    }

    this.usersService.delete(this.userToDelete.id).subscribe({
      next: (res) => {
        this.showNotification(res.message, 'success');
        this.cancelDelete();
        this.refreshTrigger$.next();
      },
      error: () => this.showNotification('Erreur lors de la suppression', 'error')
    });
  }

  formatRole(role: string): string {
    return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private resetUI(): void {
    this.editingUserId = null;
    this.userForm.reset({
      nom: '',
      prenom: '',
      email: '',
      phoneNumber: '',
      password: '',
      role: Role.AGRICULTEUR
    });
  }

  cancelEdit(): void {
    this.resetUI();
    this.showUserForm = false;
  }

  cancelDelete(): void {
    this.isDeleteModalOpen = false;
    this.userToDelete = null;
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type, show: true };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toast.show = false;
      this.cdr.detectChanges();
    }, 2000);
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
