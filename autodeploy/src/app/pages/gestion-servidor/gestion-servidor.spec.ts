import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionServidor } from './gestion-servidor';

describe('GestionServidor', () => {
  let component: GestionServidor;
  let fixture: ComponentFixture<GestionServidor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionServidor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionServidor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
