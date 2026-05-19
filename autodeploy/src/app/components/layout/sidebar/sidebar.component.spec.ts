import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Sidebar } from "./sidebar.component";

describe("Sidebar", function() {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Sidebar, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });
});
