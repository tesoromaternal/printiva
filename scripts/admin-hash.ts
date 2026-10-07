/**
 * pnpm admin:hash → pide la contraseña (oculta) y escupe el valor para
 * ADMIN_PASSWORD_HASH. La contraseña nunca va como argumento, así no queda
 * en el historial de la shell.
 *
 * Necesita una terminal REAL: el "!" de Claude Code o un pipe no tienen
 * teclado conectado (stdin no es TTY).
 */
import { hashPassword } from "../src/features/admin/crypto";

const MIN_LENGTH = 12;

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!process.stdin.isTTY) {
  fail(
    [
      "Este comando necesita una terminal interactiva para escribir la contraseña.",
      "  Ábrela en tu terminal (iTerm, Terminal, la del editor…), no con \"!\" dentro de Claude Code:",
      "",
      `    cd ${process.cwd()}`,
      "    pnpm admin:hash",
    ].join("\n"),
  );
}

/** Lee una línea sin mostrarla (muestra • por carácter). API pública: setRawMode. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let value = "";
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          // Backspace
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (char >= " ") {
          value += char;
          process.stdout.write("•");
        }
      }
    };

    stdin.on("data", onData);
  });
}

const password = await askHidden(`Contraseña del admin (mín. ${MIN_LENGTH} caracteres): `);
if (password.length < MIN_LENGTH) fail(`Tiene ${password.length} caracteres: usa al menos ${MIN_LENGTH}.`);

const repeat = await askHidden("Repítela: ");
if (password !== repeat) fail("No coinciden.");

console.log(`\nADMIN_PASSWORD_HASH=${await hashPassword(password)}\n`);
console.log("Pégalo en .env y en Vercel (Settings → Environment Variables).");
