import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarraPieApp } from './barra-pie-app';

describe('BarraPieApp', () => {
  let component: BarraPieApp;
  let fixture: ComponentFixture<BarraPieApp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarraPieApp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BarraPieApp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
