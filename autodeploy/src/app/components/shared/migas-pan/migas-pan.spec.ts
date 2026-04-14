import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MigasPan } from './migas-pan';

describe('MigasPan', () => {
  let component: MigasPan;
  let fixture: ComponentFixture<MigasPan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MigasPan]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MigasPan);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
