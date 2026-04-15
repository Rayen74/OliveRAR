import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ChefRecolSidebar } from '../chef-recol-sidebar/chef-recol-sidebar';
import { AuthService, User } from '../../../auth/auth.service';
import { UsersService } from '../.././../responsableCooperative/components/users/users.service';
import { ToastService } from '../../../shared/services/toast.service';

type EditableProfile = Pick<User, 'nom' | 'prenom' | 'email' | 'phoneNumber'>;
@Component({
  selector: 'app-responsable_chef-recolte-profile',
  imports: [CommonModule, ReactiveFormsModule,ChefRecolSidebar],
  templateUrl: './profile.html',
})
export class responsableChefRecolteProfileComponent  implements OnInit {
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
      return `${first}${last}`.toUpperCase() || 'AG';
    }

    get displayedImageUrl(): string | undefined {
      return this.imagePreviewUrl || this.currentUser?.imageUrl;
    }

    get firstNameError(): string {
      const value = (this.profileForm.get('prenom')?.value || '').trim();
      if (!this.isEditing) return '';
      return value ? '' : 'Le prénom est obligatoire.';
    }

    get lastNameError(): string {
      const value = (this.profileForm.get('nom')?.value || '').trim();
      if (!this.isEditing) return '';
      return value ? '' : 'Le nom est obligatoire.';
    }

    get emailError(): string {
      const email = (this.profileForm.get('email')?.value || '').trim();
      if (!this.isEditing) return '';
      if (!email) return 'Email obligatoire.';
      return /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/.test(email) ? '' : 'Email invalide.';
    }

    get phoneError(): string {
      const phoneNumber = (this.profileForm.get('phoneNumber')?.value || '').trim();
      if (!this.isEditing) return '';
      if (!phoneNumber) return 'Téléphone obligatoire.';
      return /^\d{8}$/.test(phoneNumber) ? '' : 'Le numéro doit contenir exactement 8 chiffres.';
    }

    get hasValidationErrors(): boolean {
      return !!(this.firstNameError || this.lastNameError || this.emailError || this.phoneError);
    }

    get hasProfileChanges(): boolean {
      if (!this.originalProfile) return false;
      const currentValue: EditableProfile = {
        nom: this.profileForm.get('nom')?.value?.trim() || '',
        prenom: this.profileForm.get('prenom')?.value?.trim() || '',
        email: this.profileForm.get('email')?.value?.trim() || '',
        phoneNumber: this.profileForm.get('phoneNumber')?.value?.trim() || ''
      };
      return JSON.stringify(currentValue) !== JSON.stringify(this.originalProfile);
    }

    enableEditing(): void { this.isEditing = true; this.error = ''; }

    cancelEditing(): void {
      if (this.currentUser) this.resetForm(this.currentUser);
      this.isEditing = false;
      this.error = '';
    }

    onFileSelected(event: Event): void {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0] ?? null;
      this.selectedFile = file;
      this.selectedFileName = file?.name ?? '';
      if (!file) { this.imagePreviewUrl = null; return; }
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

    saveProfile(): void {
      if (!this.currentUser?.id) { this.toastService.error('Erreur profil.'); return; }
      if (this.hasValidationErrors) { this.toastService.error('Corrigez les erreurs avant de sauvegarder.'); return; }
      if (!this.hasProfileChanges) { this.toastService.error('Aucune modification détectée.'); return; }

      this.isSaving = true;
      const loadingToastId = this.toastService.loading('Mise à jour...');

      this.usersService.updateProfile(this.currentUser.id, {
        nom: this.profileForm.get('nom')?.value?.trim() || '',
        prenom: this.profileForm.get('prenom')?.value?.trim() || '',
        email: this.profileForm.get('email')?.value?.trim() || '',
        phoneNumber: this.profileForm.get('phoneNumber')?.value?.trim() || ''
      }).pipe(finalize(() => this.isSaving = false)).subscribe({
        next: ({ data, user, message }) => {
          const resolvedUser = data || user;
          if (!resolvedUser) { this.toastService.update(loadingToastId, 'Échec mise à jour.', 'error'); return; }
          this.currentUser = resolvedUser;
          this.authService.updateConnectedUser(resolvedUser);
          this.resetForm(resolvedUser);
          this.isEditing = false;
          this.toastService.update(loadingToastId, message || 'Profil mis à jour avec succès.', 'success');
        },
        error: (err) => {
          this.toastService.update(loadingToastId, err?.error?.message || 'Échec mise à jour.', 'error');
        }
      });
    }

    uploadPhoto(): void {
      if (!this.currentUser?.id || !this.selectedFile) { this.toastService.error('Choisissez une image.'); return; }
      this.isUploading = true;
      const loadingToastId = this.toastService.loading('Upload en cours...');

      this.usersService.uploadPhoto(this.currentUser.id, this.selectedFile)
        .pipe(finalize(() => this.isUploading = false))
        .subscribe({
          next: ({ data, user, message }) => {
            const resolvedUser = data || user;
            if (!resolvedUser) { this.toastService.update(loadingToastId, 'Échec upload.', 'error'); return; }
            this.currentUser = resolvedUser;
            this.authService.updateConnectedUser(resolvedUser);
            this.selectedFile = null;
            this.selectedFileName = '';
            this.imagePreviewUrl = null;
            this.resetForm(resolvedUser);
            this.toastService.update(loadingToastId, message || 'Photo mise à jour.', 'success');
          },
          error: (err) => {
            this.toastService.update(loadingToastId, err?.error?.message || 'Échec upload.', 'error');
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
