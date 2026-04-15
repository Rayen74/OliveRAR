import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgriculteurSidebar } from './agriculteur-sidebar';

describe('AgriculteurSidebar', () => {
  let component: AgriculteurSidebar;
  let fixture: ComponentFixture<AgriculteurSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgriculteurSidebar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgriculteurSidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
