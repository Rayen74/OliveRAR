import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { agriculteurGuard } from './agriculteur-guard';

describe('agriculteurGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => agriculteurGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
