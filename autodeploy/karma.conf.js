// Configuracion Karma para tests unitarios Angular.
// Anade un launcher CI con --no-sandbox para que ChromeHeadless arranque en contenedores
// (GitHub Actions, Docker), y manda los reportes de cobertura a docs/assets/cobertura/frontend.

const path = require("path");

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
    },
    coverageReporter: {
      dir: path.join(__dirname, "../docs/assets/cobertura/frontend"),
      subdir: ".",
      reporters: [
        { type: "html" },
        { type: "lcovonly", file: "lcov.info" },
        { type: "text-summary" }
      ]
    }
  });
};
