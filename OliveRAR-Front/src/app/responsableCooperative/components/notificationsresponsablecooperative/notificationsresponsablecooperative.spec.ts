import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Notificationsresponsablecooperative } from './notificationsresponsablecooperative';

describe('Notificationsresponsablecooperative', () => {
  let component: Notificationsresponsablecooperative;
  let fixture: ComponentFixture<Notificationsresponsablecooperative>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notificationsresponsablecooperative]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Notificationsresponsablecooperative);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
