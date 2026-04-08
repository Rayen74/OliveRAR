import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

export const responsableCooperativeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Let browser resolve user from localStorage after hydration.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const user = authService.getConnectedUser();
  if (user?.role === Role.RESPONSABLE_COOPERATIVE) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
