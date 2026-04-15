import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

export const ResponsableLogistiqueGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getConnectedUser();

  if (user && user.role === Role.RESPONSABLE_LOGISTIQUE) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};
