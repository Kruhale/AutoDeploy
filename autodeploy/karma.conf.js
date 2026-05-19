// Configuración Karma. Solo añade un launcher ChromeHeadlessCI con
// --no-sandbox + flags para que Chromium pueda arrancar en entornos
// donde no puede crear su sandbox (contenedores Docker, CI con cgroup
// restringido, runners ubuntu-latest de GitHub Actions, etc).
// El resto de la config la provee el builder @angular/build:karma.
module.exports = function (config) {
  config.set({
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--headless=new',
        ],
      },
    },
  });
};
