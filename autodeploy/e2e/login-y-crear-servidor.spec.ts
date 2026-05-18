import { expect, test, request as solicitudPlaywright } from "@playwright/test";

const EMAIL_TEST = "demoia@test.com";
const PASSWORD_TEST = "DemoPass123";

test.describe("Flujo principal autenticado", function() {

  test.beforeEach(async function({ context, baseURL }) {
    const peticion = await solicitudPlaywright.newContext({ baseURL });
    const respuesta = await peticion.post("/api/usuarios/login", {
      data: { email: EMAIL_TEST, password: PASSWORD_TEST }
    });
    expect(respuesta.ok()).toBeTruthy();
    const cuerpo = await respuesta.json();

    await context.addInitScript(([usuario, plan, nombre, email, token]) => {
      sessionStorage.setItem("usuarioId", usuario as string);
      sessionStorage.setItem("plan", plan as string);
      sessionStorage.setItem("nombre", nombre as string);
      sessionStorage.setItem("email", email as string);
      sessionStorage.setItem("token", token as string);
    }, [cuerpo.data.id, cuerpo.data.plan, cuerpo.data.nombre, cuerpo.data.email, cuerpo.data.token]);
  });

  test("home pública carga sin sesión y muestra el logo", async function({ page, context }) {
    await context.clearCookies();
    await page.goto("/");
    await expect(page.locator(".cabecera__logo__texto")).toContainText("AutoDeploy");
  });

  test("dashboard accesible con sesión simulada", async function({ page }) {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.locator("h1")).toContainText("Panel");
  });

  test("se puede entrar a la página de nuevo despliegue", async function({ page }) {
    await page.goto("/app/nuevo-despliegue");
    await expect(page).toHaveURL(/\/app\/nuevo-despliegue/);
    await expect(page.locator("body")).toContainText(/git|GIT|repositorio/i);
  });

  test("toggle ZIP muestra la zona de subida", async function({ page }) {
    await page.goto("/app/nuevo-despliegue");
    await page.getByRole("button", { name: /ZIP|comprimido/i }).first().click();
    await expect(page.locator(".zona-zip")).toBeVisible();
    await expect(page.locator(".zona-zip__titulo")).toBeVisible();
  });

  test("la página /estado pública responde con servicios reales", async function({ page, context }) {
    await context.clearCookies();
    await page.goto("/estado");
    await expect(page.locator("h1")).toContainText(/Estado|status/i);
    await expect(page.locator(".pagina-estado__servicio").first()).toBeVisible({ timeout: 10000 });
  });
});
