import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET() {
  try {
    let appDataPath = '';
    if (process.platform === 'win32') {
      appDataPath = process.env.APPDATA || '';
    } else if (process.platform === 'darwin') {
      appDataPath = path.join(os.homedir(), 'Library', 'Application Support');
    } else {
      appDataPath = path.join(os.homedir(), '.config');
    }
    
    // Electron's app.getPath('userData') uses the productName: "FNR Administrativo"
    const logFilePath = path.join(appDataPath, 'FNR Administrativo', 'app.log');
    
    if (fs.existsSync(logFilePath)) {
      const logs = fs.readFileSync(logFilePath, 'utf8');
      return new NextResponse(logs, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    } else {
      // Fallback to check if it's named "fnr-admin" (package name)
      const alternatePath = path.join(appDataPath, 'fnr-admin', 'app.log');
      if (fs.existsSync(alternatePath)) {
        const logs = fs.readFileSync(alternatePath, 'utf8');
        return new NextResponse(logs, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      return new NextResponse(`Log file not found at: ${logFilePath} or ${alternatePath}`, { status: 404 });
    }
  } catch (error: any) {
    return new NextResponse(`Error reading logs: ${error.message}`, { status: 500 });
  }
}
