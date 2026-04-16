import { TestBed } from '@angular/core/testing';

import { CommunauteApi } from './communaute-api';

describe('CommunauteApi', () => {
  let service: CommunauteApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommunauteApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
