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

function setupDatabase() {
  console.log('Resolving persistent database path at:', destDbPath);
  
  if (!fs.existsSync(destDbPath)) {
    // Look for packaged database file to copy on first execution
    // When running packaged, files can be in app.asar or resources/app
    const sourceDbPath = path.resolve(__dirname, 'database.sqlite');
    
    try {
      if (fs.existsSync(sourceDbPath)) {
        console.log('Seeding database from packaged file:', sourceDbPath);
        fs.copyFileSync(sourceDbPath, destDbPath);
        console.log('Database successfully seeded to:', destDbPath);
      } else {
        console.log('Warning: No packaged database.sqlite found at root. Schema will be initialized fresh.');
      }
    } catch (err) {
      console.error('Error seeding database file:', err);
    }
  } else {
    console.log('Database already exists in userData directory. Using existing database.');
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
  console.log('Starting background Next.js server...');
  
  const nextBin = path.resolve(__dirname, 'node_modules/next/dist/bin/next');
  
  // Spawn Next.js production server with the persistent SQLite environment variable
  nextProcess = spawn('node', [nextBin, 'start', '-p', String(PORT)], {
    cwd: __dirname,
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      FNR_DB_PATH: destDbPath
    }
  });

  nextProcess.stdout.on('data', (data) => {
    console.log(`[Next.js stdout]: ${data}`);
  });

  nextProcess.stderr.on('data', (data) => {
    console.error(`[Next.js stderr]: ${data}`);
  });

  nextProcess.on('close', (code) => {
    console.log(`Next.js server exited with code ${code}`);
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
