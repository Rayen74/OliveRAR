import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

export const agriculteurGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getConnectedUser();

  if (user && user.role === Role.AGRICULTEUR) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};
