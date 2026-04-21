import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar';
import { AuthService, User } from '../../../auth/auth.service';
import { UsersService } from '../../../responsableCooperative/components/users/users.service';
import { ToastService } from '../../services/toast.service';
import { ApiResponse } from '../../models/api-response.model';

type EditableProfile = Pick<User, 'nom' | 'prenom' | 'email' | 'phoneNumber'>;

@Component({
  selector: 'app-shared-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './profile.html'
})
export class SharedProfileComponent implements OnInit {
  currentUser: User | null = null;
  selectedFile: File | null = null;
  selectedFileName = '';
  imagePreviewUrl: string | null = null;
  isSaving = false;
  isUploading = false;
  isEditing = false;
  error = '';
  profileForm: FormGroup;
  private originalProfile: EditableProfile | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private usersService: UsersService,
    private toastService: ToastService
  ) {
    this.profileForm = this.fb.group({
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]]
    });
  }

  ngOnInit(): void {
    const connectedUser = this.authService.getConnectedUser();
    if (!connectedUser?.id) {
      this.error = 'Impossible de charger votre profil.';
      return;
    }

    this.currentUser = connectedUser;
    this.resetForm(connectedUser);

    this.loadUserProfile(connectedUser.id);
  }

  /**
   * Fetches latest user data from server.
   */
  private loadUserProfile(userId: string): void {
    this.usersService.getById(userId).subscribe({
      next: (response: ApiResponse<User>) => {
        const resolvedUser = response.data || response.user;
        if (resolvedUser) {
          this.currentUser = resolvedUser;
          this.authService.updateConnectedUser(resolvedUser);
          this.resetForm(resolvedUser);
        }
      },
      error: () => {
        this.error = 'Le profil local a été chargé, mais la synchronisation serveur a échoué.';
      }
    });
  }

  get initials(): string {
    const first = this.currentUser?.prenom?.charAt(0) ?? '';
    const last = this.currentUser?.nom?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }

  get displayedImageUrl(): string | undefined {
    return this.imagePreviewUrl || this.currentUser?.imageUrl;
  }

  // Form Field Errors
  get firstNameError(): string {
    const control = this.profileForm.get('prenom');
    if (control?.touched && control?.errors?.['required']) return 'Le prénom est obligatoire.';
    return '';
  }

  get lastNameError(): string {
    const control = this.profileForm.get('nom');
    if (control?.touched && control?.errors?.['required']) return 'Le nom est obligatoire.';
    return '';
  }

  get emailError(): string {
    const control = this.profileForm.get('email');
    if (control?.touched) {
      if (control.errors?.['required']) return 'L\'email est obligatoire.';
      if (control.errors?.['email']) return 'Format d\'email invalide.';
    }
    return '';
  }

  get phoneError(): string {
    const control = this.profileForm.get('phoneNumber');
    if (control?.touched) {
      if (control.errors?.['required']) return 'Le téléphone est obligatoire.';
      if (control.errors?.['pattern']) return 'Le numéro doit contenir exactement 8 chiffres.';
    }
    return '';
  }

  get hasValidationErrors(): boolean {
    return this.profileForm.invalid;
  }

  get hasProfileChanges(): boolean {
    if (!this.originalProfile) return false;
    const currentValue = this.profileForm.value;
    return JSON.stringify(currentValue) !== JSON.stringify(this.originalProfile);
  }

  enableEditing(): void {
    this.isEditing = true;
    this.error = '';
  }

  cancelEditing(): void {
    if (this.currentUser) this.resetForm(this.currentUser);
    this.isEditing = false;
    this.error = '';
  }

  /**
   * Formats backend role string.
   */
  formatRole(role?: string): string {
    if (!role) return '';
    return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    this.selectedFileName = file?.name ?? '';

    if (!file) {
      this.imagePreviewUrl = null;
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.selectedFile = null;
      this.selectedFileName = '';
      this.imagePreviewUrl = null;
      this.toastService.error('Veuillez choisir une image valide.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreviewUrl = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Saves profile modifications.
   */
  saveProfile(): void {
    if (!this.currentUser?.id) {
      this.toastService.error('Erreur: Utilisateur non trouvé.');
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toastService.error('Veuillez corriger les erreurs avant de sauvegarder.');
      return;
    }

    this.isSaving = true;
    const loadingToastId = this.toastService.loading('Mise à jour du profil...');

    this.usersService.updateProfile(this.currentUser.id, this.profileForm.value).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: (response) => {
        const resolvedUser = response.data || response.user;
        if (resolvedUser) {
          this.currentUser = resolvedUser;
          this.authService.updateConnectedUser(resolvedUser);
          this.resetForm(resolvedUser);
          this.isEditing = false;
          this.toastService.update(loadingToastId, response.message || 'Profil mis à jour.', 'success');
        }
      },
      error: (err) => {
        this.toastService.update(loadingToastId, err?.error?.message || 'Échec de la mise à jour.', 'error');
      }
    });
  }

  /**
   * Uploads profile picture.
   */
  uploadPhoto(): void {
    if (!this.currentUser?.id || !this.selectedFile) {
      this.toastService.error('Veuillez choisir une image.');
      return;
    }

    this.isUploading = true;
    const loadingToastId = this.toastService.loading('Upload en cours...');

    this.usersService.uploadPhoto(this.currentUser.id, this.selectedFile).pipe(
      finalize(() => this.isUploading = false)
    ).subscribe({
      next: (response) => {
        const resolvedUser = response.data || response.user;
        if (resolvedUser) {
          this.currentUser = resolvedUser;
          this.authService.updateConnectedUser(resolvedUser);
          this.selectedFile = null;
          this.selectedFileName = '';
          this.imagePreviewUrl = null;
          this.resetForm(resolvedUser);
          this.toastService.update(loadingToastId, response.message || 'Photo mise à jour.', 'success');
        }
      },
      error: (err) => {
        this.toastService.update(loadingToastId, err?.error?.message || 'Échec de l\'upload.', 'error');
      }
    });
  }

  private resetForm(user: User): void {
    this.originalProfile = {
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      phoneNumber: user.phoneNumber
    };
    this.profileForm.patchValue(this.originalProfile);
  }
}
