import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService, User } from '../../../auth/auth.service';
import { UsersService } from '../users/users.service';
import { ToastService } from '../../../shared/services/toast.service';

type EditableProfile = Pick<User, 'nom' | 'prenom' | 'email' | 'phoneNumber'>;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;
  selectedFile: File | null = null;
  selectedFileName = '';
  imagePreviewUrl: string | null = null;
  isSaving = false;
  isUploading = false;
  isEditing = false;
  error = '';
  profileForm;
  private originalProfile: EditableProfile | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private usersService: UsersService,
    private toastService: ToastService
  ) {
    this.profileForm = this.fb.group({
      nom: [''],
      prenom: [''],
      email: [''],
      phoneNumber: ['']
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

    this.usersService.getById(connectedUser.id).subscribe({
      next: ({ data, user }) => {
        const resolvedUser = data || user;
        this.currentUser = resolvedUser;
        this.authService.updateConnectedUser(resolvedUser);
        this.resetForm(resolvedUser);
      },
      error: () => {
        this.error = 'Le profil local a ete charge, mais la synchronisation serveur a echoue.';
      }
    });
  }

  get initials(): string {
    const first = this.currentUser?.prenom?.charAt(0) ?? '';
    const last = this.currentUser?.nom?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'OP';
  }

  get displayedImageUrl(): string | undefined {
    return this.imagePreviewUrl || this.currentUser?.imageUrl;
  }

  get firstNameError(): string {
    const value = (this.profileForm.get('prenom')?.value || '').trim();
    if (!this.isEditing) {
      return '';
    }
    return value ? '' : 'First name is required.';
  }

  get lastNameError(): string {
    const value = (this.profileForm.get('nom')?.value || '').trim();
    if (!this.isEditing) {
      return '';
    }
    return value ? '' : 'Last name is required.';
  }

  get emailError(): string {
    const email = (this.profileForm.get('email')?.value || '').trim();
    if (!this.isEditing) {
      return '';
    }
    if (!email) {
      return 'Email is required.';
    }
    return /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/.test(email) ? '' : 'Please enter a valid email address.';
  }

  get phoneError(): string {
    const phoneNumber = (this.profileForm.get('phoneNumber')?.value || '').trim();
    if (!this.isEditing) {
      return '';
    }
    if (!phoneNumber) {
      return 'Phone number is required.';
    }
    return /^\d{8}$/.test(phoneNumber) ? '' : 'Phone number must contain exactly 8 digits.';
  }

  get hasValidationErrors(): boolean {
    return !!(this.firstNameError || this.lastNameError || this.emailError || this.phoneError);
  }

  get hasProfileChanges(): boolean {
    if (!this.originalProfile) {
      return false;
    }

    const currentValue: EditableProfile = {
      nom: this.profileForm.get('nom')?.value?.trim() || '',
      prenom: this.profileForm.get('prenom')?.value?.trim() || '',
      email: this.profileForm.get('email')?.value?.trim() || '',
      phoneNumber: this.profileForm.get('phoneNumber')?.value?.trim() || ''
    };

    return JSON.stringify(currentValue) !== JSON.stringify(this.originalProfile);
  }

  enableEditing(): void {
    this.isEditing = true;
    this.error = '';
  }

  cancelEditing(): void {
    if (this.currentUser) {
      this.resetForm(this.currentUser);
    }
    this.isEditing = false;
    this.error = '';
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
      this.toastService.error('Please choose a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreviewUrl = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  saveProfile(): void {
    if (!this.currentUser?.id) {
      this.toastService.error('Failed to update profile. Please try again.');
      return;
    }

    if (this.hasValidationErrors) {
      this.toastService.error('Please fix the highlighted fields before saving.');
      return;
    }

    if (!this.hasProfileChanges) {
      this.toastService.error('No profile changes detected.');
      return;
    }

    this.isSaving = true;
    const loadingToastId = this.toastService.loading('Updating profile...');

    this.usersService.updateProfile(this.currentUser.id, {
      nom: this.profileForm.get('nom')?.value?.trim() || '',
      prenom: this.profileForm.get('prenom')?.value?.trim() || '',
      email: this.profileForm.get('email')?.value?.trim() || '',
      phoneNumber: this.profileForm.get('phoneNumber')?.value?.trim() || ''
    }).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: ({ data, user, message }) => {
        const resolvedUser = data || user;
        if (!resolvedUser) {
          this.toastService.update(loadingToastId, 'Failed to update profile.', 'error');
          return;
        }
        this.currentUser = resolvedUser;
        this.authService.updateConnectedUser(resolvedUser);
        this.resetForm(resolvedUser);
        this.isEditing = false;
        this.toastService.update(loadingToastId, message || 'Profile updated successfully.', 'success');
      },
      error: (err) => {
        this.toastService.update(
          loadingToastId,
          err?.error?.message || 'Failed to update profile. Please try again.',
          'error'
        );
      }
    });
  }

  uploadPhoto(): void {
    if (!this.currentUser?.id || !this.selectedFile) {
      this.toastService.error('Please choose an image before uploading.');
      return;
    }

    this.isUploading = true;
    const loadingToastId = this.toastService.loading('Uploading profile picture...');

    this.usersService.uploadPhoto(this.currentUser.id, this.selectedFile).pipe(
      finalize(() => this.isUploading = false)
    ).subscribe({
      next: ({ data, user, message }) => {
        const resolvedUser = data || user;
        if (!resolvedUser) {
          this.toastService.update(loadingToastId, 'Image upload failed.', 'error');
          return;
        }
        this.currentUser = resolvedUser;
        this.authService.updateConnectedUser(resolvedUser);
        this.selectedFile = null;
        this.selectedFileName = '';
        this.imagePreviewUrl = null;
        this.resetForm(resolvedUser);
        this.toastService.update(loadingToastId, message || 'Profile picture uploaded successfully.', 'success');
      },
      error: (err) => {
        this.toastService.update(
          loadingToastId,
          err?.error?.message || 'Image upload failed.',
          'error'
        );
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
