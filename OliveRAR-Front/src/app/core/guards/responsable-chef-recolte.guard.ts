import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from '../auth/auth.service';

export const responsableChefRecolteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getConnectedUser()?.role === Role.RESPONSABLE_CHEF_RECOLTE) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
