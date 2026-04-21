import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from '../auth/auth.service';

export const responsableLogistiqueGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getConnectedUser()?.role === Role.RESPONSABLE_LOGISTIQUE) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
