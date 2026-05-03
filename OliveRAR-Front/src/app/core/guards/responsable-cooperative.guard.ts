import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from '../auth/auth.service';

export const responsableCooperativeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const user = authService.getConnectedUser();
  const userRole = user?.role as string;
  
  if (userRole === 'RESPONSABLE_COOPERATIVE' || userRole === Role.RESPONSABLE_COOPERATIVE) {
    return true;
  }

  console.warn('ResponsableCooperativeGuard: Access denied for role', userRole);
  router.navigate(['/login']);
  return false;
};
