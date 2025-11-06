#!/usr/bin/env node

/**
 * Script de Ayuda para Actualizar la PWA
 *
 * Uso:
 *   node update-pwa-version.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const SW_PATH = path.join(__dirname, "public", "sw.js");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function getCurrentVersion() {
  const swContent = fs.readFileSync(SW_PATH, "utf8");
  const match = swContent.match(/const VERSION = ['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

function incrementVersion(version, type = "patch") {
  const parts = version.split(".").map(Number);

  switch (type) {
    case "major":
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case "minor":
      parts[1]++;
      parts[2] = 0;
      break;
    case "patch":
    default:
      parts[2]++;
      break;
  }

  return parts.join(".");
}

function updateVersion(newVersion) {
  let swContent = fs.readFileSync(SW_PATH, "utf8");
  swContent = swContent.replace(
    /const VERSION = ['"][^'"]+['"]/,
    `const VERSION = '${newVersion}'`
  );
  fs.writeFileSync(SW_PATH, swContent, "utf8");
  console.log(`✅ Versión actualizada a ${newVersion} en ${SW_PATH}`);
}

function main() {
  const currentVersion = getCurrentVersion();

  if (!currentVersion) {
    console.error("❌ No se pudo encontrar la versión actual en sw.js");
    process.exit(1);
  }

  console.log(`📦 Versión actual: ${currentVersion}\n`);
  console.log("¿Qué tipo de actualización es?");
  console.log("1. Patch (corrección de bugs): 1.0.0 → 1.0.1");
  console.log("2. Minor (nueva característica): 1.0.0 → 1.1.0");
  console.log("3. Major (cambios importantes): 1.0.0 → 2.0.0");
  console.log("4. Personalizada (ingresar manualmente)");
  console.log("0. Cancelar\n");

  rl.question("Opción (1-4, 0 para cancelar): ", (answer) => {
    let newVersion;

    switch (answer.trim()) {
      case "1":
        newVersion = incrementVersion(currentVersion, "patch");
        updateVersion(newVersion);
        showNextSteps();
        rl.close();
        break;

      case "2":
        newVersion = incrementVersion(currentVersion, "minor");
        updateVersion(newVersion);
        showNextSteps();
        rl.close();
        break;

      case "3":
        newVersion = incrementVersion(currentVersion, "major");
        updateVersion(newVersion);
        showNextSteps();
        rl.close();
        break;

      case "4":
        rl.question("Ingresar nueva versión (ej: 2.5.3): ", (customVersion) => {
          if (/^\d+\.\d+\.\d+$/.test(customVersion.trim())) {
            updateVersion(customVersion.trim());
            showNextSteps();
          } else {
            console.error(
              "❌ Formato inválido. Usar formato X.Y.Z (ej: 1.2.3)"
            );
          }
          rl.close();
        });
        break;

      case "0":
        console.log("❌ Cancelado");
        rl.close();
        break;

      default:
        console.error("❌ Opción inválida");
        rl.close();
        break;
    }
  });
}

function showNextSteps() {
  console.log("\n📋 Próximos pasos:\n");
  console.log("1. git add .");
  console.log('2. git commit -m "Actualizar PWA a versión X.X.X"');
  console.log("3. git push");
  console.log(
    "\nLos usuarios verán la actualización automáticamente en ~1 minuto"
  );
}

main();
