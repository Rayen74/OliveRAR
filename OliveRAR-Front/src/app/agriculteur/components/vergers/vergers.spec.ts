import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Vergers } from './vergers';

describe('Vergers', () => {
  let component: Vergers;
  let fixture: ComponentFixture<Vergers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Vergers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Vergers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
