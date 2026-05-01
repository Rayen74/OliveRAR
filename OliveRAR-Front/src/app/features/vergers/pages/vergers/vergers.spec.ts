import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VergersComponent } from './vergers';

describe('VergersComponent', () => {
  let component: VergersComponent;
  let fixture: ComponentFixture<VergersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VergersComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(VergersComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
