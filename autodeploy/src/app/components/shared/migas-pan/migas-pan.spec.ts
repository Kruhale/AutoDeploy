import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { MigasPan } from "./migas-pan";

describe("MigasPan", function() {
  let component: MigasPan;
  let fixture: ComponentFixture<MigasPan>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [MigasPan, TranslateModule.forRoot()],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MigasPan);
    fixture.componentRef.setInput("migas", []);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });
});
