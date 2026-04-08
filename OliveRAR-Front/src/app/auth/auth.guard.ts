import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Avoid redirecting to login during SSR/prerender phase.
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (authService.hasToken()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
