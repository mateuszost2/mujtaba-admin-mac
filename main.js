const { app, BrowserWindow, ipcMain, dialog, powerSaveBlocker } = require('electron');
const path = require('path');
const fs = require('fs');
const { Client } = require('ssh2');

let mainWindow;
let sshClient = null;
let sftpSession = null;
let connectionConfig = null;
let currentUploadReadStream = null;
let currentUploadWriteStream = null;
let currentUploadResolve = null;
let uploadCancelled = false;
let intentionalDisconnect = false;
let powerSaveId = null;

function startPowerSave() {
  if (powerSaveId === null) powerSaveId = powerSaveBlocker.start('prevent-app-suspension');
}
function stopPowerSave() {
  if (powerSaveId !== null) { powerSaveBlocker.stop(powerSaveId); powerSaveId = null; }
}

const CONFIG_PATH = path.join(app.getPath('userData'), 'connection.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    ...(process.platform !== 'darwin' && {
      titleBarOverlay: {
        color: '#0C0C0B',
        symbolColor: '#C9A96E',
        height: 32,
      },
    }),
    backgroundColor: '#0C0C0B',
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => {
  if (sshClient) sshClient.end();
  if (process.platform !== 'darwin') app.quit();
});

// ── Connect ──
function connectSsh(config) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    const opts = {
      host: config.host,
      port: config.port || 22,
      username: config.username,
      readyTimeout: 10000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 6,
    };
    if (config.keyPath && fs.existsSync(config.keyPath)) {
      opts.privateKey = fs.readFileSync(config.keyPath);
      if (config.passphrase) opts.passphrase = config.passphrase;
    } else if (config.password) {
      opts.password = config.password;
    }
    client.on('ready', () => resolve(client));
    client.on('error', reject);
    client.connect(opts);
  });
}

function getSftp(client) {
  return new Promise((resolve, reject) => {
    client.sftp((err, sftp) => {
      if (err) reject(err);
      else resolve(sftp);
    });
  });
}

ipcMain.handle('load-config', () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {}
  return null;
});

ipcMain.handle('save-config', (_, config) => {
  try {
    const safe = { host: config.host, username: config.username, keyPath: config.keyPath, remotePath: config.remotePath };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(safe, null, 2));
    return true;
  } catch { return false; }
});

ipcMain.handle('pick-key-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select SSH Key',
    filters: [{ name: 'SSH Key', extensions: ['pem', 'ppk', 'ed25519', 'key'] }, { name: 'All Files', extensions: ['*'] }],
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('pick-files', async (_, accept) => {
  const filters = accept === 'image'
    ? [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    : accept === 'video'
    ? [{ name: 'Videos', extensions: ['mp4', 'mov', 'webm'] }]
    : [{ name: 'Media', extensions: ['mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'webp'] }];
  const result = await dialog.showOpenDialog(mainWindow, { title: 'Select files', filters, properties: ['openFile', 'multiSelections'] });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('connect', async (_, config) => {
  try {
    if (sshClient) { try { sshClient.end(); } catch {} }
    intentionalDisconnect = false;
    const client = await connectSsh(config);
    sftpSession = await getSftp(client);
    sshClient = client;
    connectionConfig = config;

    client.on('error', () => {
      if (intentionalDisconnect) return;
      sshClient = null; sftpSession = null;
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('connection-lost');
    });
    client.on('close', () => {
      if (intentionalDisconnect) return;
      sshClient = null; sftpSession = null;
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('connection-lost');
    });

    return { ok: true };
  } catch (e) {
    sshClient = null; sftpSession = null;
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('disconnect', async () => {
  intentionalDisconnect = true;
  if (sshClient) { try { sshClient.end(); } catch {} sshClient = null; sftpSession = null; }
  return true;
});

ipcMain.handle('is-connected', () => sshClient !== null);

ipcMain.handle('read-json', async (_, remotePath) => {
  if (!sftpSession) return { ok: false, error: 'Not connected' };
  return new Promise(resolve => {
    const chunks = [];
    const stream = sftpSession.createReadStream(remotePath);
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => {
      try { resolve({ ok: true, data: JSON.parse(Buffer.concat(chunks).toString()) }); }
      catch (e) { resolve({ ok: false, error: e.message }); }
    });
    stream.on('error', e => resolve({ ok: false, error: e.message }));
  });
});

ipcMain.handle('write-json', async (_, remotePath, data) => {
  if (!sftpSession) return { ok: false, error: 'Not connected' };
  return new Promise(resolve => {
    const buf = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
    const stream = sftpSession.createWriteStream(remotePath);
    stream.on('close', () => resolve({ ok: true }));
    stream.on('error', e => resolve({ ok: false, error: e.message }));
    stream.end(buf);
  });
});

ipcMain.handle('upload-file', async (_, localPath, remotePath) => {
  if (!sftpSession) return { ok: false, error: 'Not connected' };
  uploadCancelled = false;
  startPowerSave();
  return new Promise(resolve => {
    let fileSize = 0;
    try { fileSize = fs.statSync(localPath).size; } catch {}
    const readStream = fs.createReadStream(localPath);
    const writeStream = sftpSession.createWriteStream(remotePath);
    currentUploadReadStream = readStream;
    currentUploadWriteStream = writeStream;
    currentUploadResolve = resolve;
    let transferred = 0;
    readStream.on('data', chunk => {
      transferred += chunk.length;
      if (fileSize > 0 && !uploadCancelled)
        mainWindow.webContents.send('upload-progress', {
          pct: Math.min(99, Math.round(transferred / fileSize * 100)),
          transferred,
          fileSize,
        });
    });
    writeStream.on('close', () => {
      currentUploadReadStream = null; currentUploadWriteStream = null; currentUploadResolve = null;
      stopPowerSave();
      if (!uploadCancelled) { mainWindow.webContents.send('upload-progress', 100); resolve({ ok: true }); }
    });
    writeStream.on('error', e => {
      currentUploadReadStream = null; currentUploadWriteStream = null; currentUploadResolve = null;
      stopPowerSave();
      if (!uploadCancelled) resolve({ ok: false, error: e.message });
    });
    readStream.pipe(writeStream);
  });
});

ipcMain.handle('cancel-upload', () => {
  uploadCancelled = true;
  stopPowerSave();
  if (currentUploadResolve) { currentUploadResolve({ ok: false, error: 'Cancelled' }); currentUploadResolve = null; }
  if (currentUploadReadStream) { try { currentUploadReadStream.destroy(); } catch {} currentUploadReadStream = null; }
  if (currentUploadWriteStream) { try { currentUploadWriteStream.destroy(); } catch {} currentUploadWriteStream = null; }
  return true;
});

ipcMain.handle('delete-file', async (_, remotePath) => {
  if (!sftpSession) return { ok: false, error: 'Not connected' };
  return new Promise(resolve => {
    sftpSession.unlink(remotePath, err => {
      if (err) resolve({ ok: false, error: err.message });
      else resolve({ ok: true });
    });
  });
});

ipcMain.handle('set-title-bar-overlay', (_, opts) => {
  if (process.platform !== 'darwin') mainWindow.setTitleBarOverlay(opts);
});

ipcMain.handle('exec-command', (_, cmd) => {
  if (!sshClient) return { ok: false, error: 'Not connected' };
  const wrapped = `bash -c "source ~/.venv/bin/activate && ${cmd.replace(/"/g, '\\"')}"`;
  return new Promise(resolve => {
    sshClient.exec(wrapped, (err, stream) => {
      if (err) return resolve({ ok: false, error: err.message });
      const out = [], errOut = [];
      stream.on('data', d => out.push(d));
      stream.stderr.on('data', d => errOut.push(d));
      stream.on('close', code => {
        const stdout = Buffer.concat(out).toString();
        const stderr = Buffer.concat(errOut).toString();
        resolve(code === 0 ? { ok: true, stdout } : { ok: false, error: stderr || stdout });
      });
    });
  });
});

ipcMain.handle('read-file-base64', async (_, remotePath) => {
  if (!sftpSession) return { ok: false, error: 'Not connected' };
  return new Promise(resolve => {
    const chunks = [];
    const stream = sftpSession.createReadStream(remotePath);
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => resolve({ ok: true, data: Buffer.concat(chunks).toString('base64') }));
    stream.on('error', e => resolve({ ok: false, error: e.message }));
  });
});