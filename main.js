const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let nextProcess;
const PORT = 12026; // Custom port to prevent conflicts with developers running other Next.js apps on 3000

// Determine the writeable database path in user data folder
const userDataPath = app.getPath('userData');
const destDbPath = path.join(userDataPath, 'database.sqlite');
const logFilePath = path.join(userDataPath, 'app.log');

// Initialize a fresh log file on startup
try {
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  if (fs.existsSync(logFilePath)) {
    fs.unlinkSync(logFilePath);
  }
} catch (e) {
  console.error('Failed to initialize log file:', e);
}

function logToFile(message) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

function setupDatabase() {
  logToFile(`Resolving persistent database path at: ${destDbPath}`);
  
  // Ensure the parent directory exists
  if (!fs.existsSync(userDataPath)) {
    try {
      fs.mkdirSync(userDataPath, { recursive: true });
      logToFile('Created AppData directory.');
    } catch (err) {
      logToFile(`Error creating AppData directory: ${err.message}`);
    }
  }
  
  const sourceDbPath = path.resolve(__dirname, 'database.sqlite');
  let shouldCopy = false;
  
  if (!fs.existsSync(destDbPath)) {
    logToFile('Database does not exist in userData directory. Needs seeding.');
    shouldCopy = true;
  } else {
    try {
      const destStats = fs.statSync(destDbPath);
      if (fs.existsSync(sourceDbPath)) {
        const sourceStats = fs.statSync(sourceDbPath);
        logToFile(`Database file sizes: destination=${destStats.size} bytes, source=${sourceStats.size} bytes`);
        // If destination is smaller than 25KB and source is larger, it was probably initialized as empty by a failed startup
        if (destStats.size < 25000 && sourceStats.size >= 50000) {
          logToFile(`Database exists but is empty/unseeded (size: ${destStats.size} bytes). Re-seeding from source (${sourceStats.size} bytes)...`);
          shouldCopy = true;
        }
      } else {
        logToFile(`Warning: Source database file not found at: ${sourceDbPath}`);
      }
    } catch (err) {
      logToFile(`Error checking database file sizes: ${err.message}`);
    }
  }

  if (shouldCopy) {
    try {
      if (fs.existsSync(sourceDbPath)) {
        logToFile(`Seeding database from packaged file: ${sourceDbPath}`);
        fs.copyFileSync(sourceDbPath, destDbPath);
        logToFile(`Database successfully seeded to: ${destDbPath}`);
      } else {
        logToFile('Warning: No packaged database.sqlite found at root. Schema will be initialized fresh.');
      }
    } catch (err) {
      logToFile(`Error seeding database file: ${err.message}`);
    }
  } else {
    logToFile('Database already exists in userData directory and is populated. Using existing database.');
  }
}

function checkServerReady(callback) {
  const req = http.request({ port: PORT, method: 'HEAD', path: '/' }, (res) => {
    if (res.statusCode === 200) {
      callback();
    } else {
      setTimeout(() => checkServerReady(callback), 200);
    }
  });
  req.on('error', () => {
    setTimeout(() => checkServerReady(callback), 200);
  });
  req.end();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: "FNR Administrativo 2026",
    autoHideMenuBar: true, // Auto hide menu bar (Alt to show) for clean ERP look on Windows
    icon: path.join(__dirname, 'public/favicon.ico'), // icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  console.log('Starting background Next.js server using embedded node runtime...');
  
  const nextBin = path.resolve(__dirname, 'node_modules/next/dist/bin/next');
  
  // Spawn Next.js server using Electron's own executable in Node.js mode.
  // This removes any dependency on a global Node.js installation!
  nextProcess = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
    cwd: __dirname,
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      ELECTRON_RUN_AS_NODE: '1',
      FNR_DB_PATH: destDbPath
    }
  });

  nextProcess.stdout.on('data', (data) => {
    const message = `[Next.js stdout]: ${data.toString().trim()}`;
    console.log(message);
    logToFile(message);
  });

  nextProcess.stderr.on('data', (data) => {
    const message = `[Next.js stderr]: ${data.toString().trim()}`;
    console.error(message);
    logToFile(message);
  });

  nextProcess.on('close', (code) => {
    const message = `Next.js server exited with code ${code}`;
    console.log(message);
    logToFile(message);
  });
}

app.on('ready', () => {
  // 1. Resolve and copy database if first run
  setupDatabase();

  // 2. Start the next production server
  startNextServer();
  
  // 3. Wait for port to be active, then open desktop BrowserWindow
  checkServerReady(() => {
    createWindow();
  });
});

app.on('window-all-closed', () => {
  // Quit application when all windows are closed (standard Windows behavior)
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Ensure background Next.js process is killed when Electron exits
  if (nextProcess) {
    console.log('Stopping Next.js server...');
    nextProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
