const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadConfig:   ()                    => ipcRenderer.invoke('load-config'),
  saveConfig:   (config)              => ipcRenderer.invoke('save-config', config),
  pickKeyFile:  ()                    => ipcRenderer.invoke('pick-key-file'),
  pickFiles:    (accept)              => ipcRenderer.invoke('pick-files', accept),
  connect:      (config)              => ipcRenderer.invoke('connect', config),
  disconnect:   ()                    => ipcRenderer.invoke('disconnect'),
  isConnected:  ()                    => ipcRenderer.invoke('is-connected'),
  listFiles:    (remotePath)          => ipcRenderer.invoke('list-files', remotePath),
  readJson:     (remotePath)          => ipcRenderer.invoke('read-json', remotePath),
  writeJson:    (remotePath, data)    => ipcRenderer.invoke('write-json', remotePath, data),
  uploadFile:   (localPath, remotePath) => ipcRenderer.invoke('upload-file', localPath, remotePath),
  cancelUpload: ()                      => ipcRenderer.invoke('cancel-upload'),
  deleteFile:   (remotePath)          => ipcRenderer.invoke('delete-file', remotePath),
  readFileBase64: (remotePath) => ipcRenderer.invoke('read-file-base64', remotePath),
  execCommand:    (cmd)        => ipcRenderer.invoke('exec-command', cmd),
  onUploadProgress: (cb) => {
    ipcRenderer.removeAllListeners('upload-progress');
    ipcRenderer.on('upload-progress', (_, data) => cb(data));
  },
  onConnectionLost: (cb) => {
    ipcRenderer.removeAllListeners('connection-lost');
    ipcRenderer.on('connection-lost', () => cb());
  },
  setTitleBarOverlay: (opts) => ipcRenderer.invoke('set-title-bar-overlay', opts),
});
