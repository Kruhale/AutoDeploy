import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoDespliegue } from './nuevo-despliegue';

describe('NuevoDespliegue', () => {
  let component: NuevoDespliegue;
  let fixture: ComponentFixture<NuevoDespliegue>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoDespliegue]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoDespliegue);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
