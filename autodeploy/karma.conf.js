// Configuración Karma mínima — añade un launcher CI con --no-sandbox
// para que ChromeHeadless arranque en contenedores (GitHub Actions, Docker).
// El resto (frameworks, plugins, reporters) lo aporta @angular/build:karma.

const { constants } = require("karma");

module.exports = function (config) {
  config.set({
    frameworks: ["jasmine"],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: "ChromeHeadless",
        flags: [
          "--no-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-software-rasterizer"
        ]
      }
    }
  });
};
