const readline = require("readline");

// Shared queue for non-interactive piped stdin (e.g. automated tests)
let pipedReader = null;
const pipedLines = [];
const pipedResolvers = [];

function getNextPipedLine() {
  return new Promise((resolve) => {
    if (pipedLines.length > 0) {
      return resolve(pipedLines.shift());
    }
    pipedResolvers.push(resolve);
    if (!pipedReader) {
      pipedReader = readline.createInterface({
        input: process.stdin,
        terminal: false,
      });
      pipedReader.on("line", (line) => {
        if (pipedResolvers.length > 0) {
          const res = pipedResolvers.shift();
          res(line.trim());
        } else {
          pipedLines.push(line.trim());
        }
      });
      pipedReader.on("close", () => {
        while (pipedResolvers.length > 0) {
          const res = pipedResolvers.shift();
          res("");
        }
      });
    }
  });
}

/**
 * Universal, secure masked password prompt for Windows PowerShell and Unix terminals.
 * - Raw terminal mode: Characters are NEVER displayed.
 * - Masked with '*' for every typed or pasted printable character.
 * - Full support for spaces, backspace (\b, \x7f, \u0008), Enter (\r, \n), and pasting.
 * - Ignores arrow keys and escape sequences.
 * - Piped stdin support for automated testing without TTY.
 *
 * @param {string} promptText Prompt message to display before input.
 * @returns {Promise<string>} The captured password string.
 */
function promptPassword(promptText = "Password: ") {
  return new Promise((resolve) => {
    process.stdout.write(promptText);

    // Non-interactive fallback (e.g. automated test piped input)
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin });
      rl.on("line", (line) => {
        rl.close();
        resolve(line.trim());
      });
      getNextPipedLine().then(resolve);
      return;
    }

    let buffer = "";

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function onData(chunk) {
      if (chunk.includes("\u0003")) {
        // Ctrl+C
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.exit(1);
      }

      // Ignore ANSI escape sequences (Arrow keys, Home, End, PageUp/Down)
      if (chunk.startsWith("\u001b")) {
        return;
      }

      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i];

        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(buffer);
          return;
        }

        if (ch === "\b" || ch === "\x7f" || ch === "\u0008") {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (ch.charCodeAt(0) >= 32) {
          buffer += ch;
          process.stdout.write("*");
        }
      }
    }

    process.stdin.on("data", onData);
  });
}

/**
 * Standard text prompt for non-sensitive input.
 *
 * @param {string} promptText Prompt message to display.
 * @returns {Promise<string>} The captured text string.
 */
function promptText(promptText) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      process.stdout.write(promptText);
      getNextPipedLine().then(resolve);
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

module.exports = { promptPassword, promptText };


