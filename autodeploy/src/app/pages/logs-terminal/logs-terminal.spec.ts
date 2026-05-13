import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogsTerminal } from './logs-terminal';

describe('LogsTerminal', () => {
  let component: LogsTerminal;
  let fixture: ComponentFixture<LogsTerminal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogsTerminal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogsTerminal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
