import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarjetaEstadistica } from './tarjeta-estadistica';

describe('TarjetaEstadistica', () => {
  let component: TarjetaEstadistica;
  let fixture: ComponentFixture<TarjetaEstadistica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarjetaEstadistica]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarjetaEstadistica);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
