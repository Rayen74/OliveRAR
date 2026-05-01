import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogistiqueCollecte } from './logistique-collecte';

describe('LogistiqueCollecte', () => {
  let component: LogistiqueCollecte;
  let fixture: ComponentFixture<LogistiqueCollecte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogistiqueCollecte]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogistiqueCollecte);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
