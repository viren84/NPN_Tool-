const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let mainWindow;
let nextProcess;

const isDev = process.env.NODE_ENV === "development";
const PORT = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "NPN Filing Tool — Health Canada",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "../public/icon.png"),
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function startNextServer() {
  return new Promise((resolve) => {
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
    nextProcess = spawn(cmd, ["next", "start", "-p", String(PORT)], {
      cwd: path.join(__dirname, ".."),
      stdio: "pipe",
      shell: true,
    });

    nextProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log("[Next.js]", output);
      if (output.includes("Ready") || output.includes(`localhost:${PORT}`)) {
        resolve();
      }
    });

    nextProcess.stderr.on("data", (data) => {
      console.error("[Next.js Error]", data.toString());
    });

    // Fallback: resolve after 5 seconds
    setTimeout(resolve, 5000);
  });
}

app.whenReady().then(async () => {
  if (!isDev) {
    await startNextServer();
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (nextProcess) nextProcess.kill();
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
