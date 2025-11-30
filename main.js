const { app, BrowserWindow, session, ipcMain } = require('electron')
const path = require('path')

let mainWin, loadingWin

function createLoadingWindow() {
  loadingWin = new BrowserWindow({
    width: 600,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    }
  })

  loadingWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <style>
      body {
        margin:0;
        background: #121212;
        color: #fff;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        height: 100vh;
        overflow: hidden;
        user-select: none;
      }
      h1 {
        font-weight: 700;
        font-size: 2.2rem;
        margin-bottom: 1rem;
      }
      p {
        font-size: 1.1rem;
        margin-bottom: 3rem;
        color: #bbb;
      }
      .loader {
        display: flex;
        gap: 10px;
      }
      .dot {
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background:rgb(219, 219, 219);
        animation: pulse 1.2s infinite ease-in-out;
      }
      .dot:nth-child(2) {
        animation-delay: 0.2s;
      }
      .dot:nth-child(3) {
        animation-delay: 0.4s;
      }
      @keyframes pulse {
        0%, 80%, 100% {
          opacity: 0.3;
          transform: scale(1);
        }
        40% {
          opacity: 1;
          transform: scale(1.4);
        }
      }
    </style>
    <body>
      <h1>Welcome to FMFAU Desktop</h1>
      <p>Enjoy it all with no redirects!</p>
      <div class="loader">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </body>
  `)}`)

  loadingWin.on('closed', () => {
    loadingWin = null
  })
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    fullscreen: true,
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  const allowedHost = 'fmfau.org'

  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const url = new URL(details.url)

    if (details.resourceType === 'mainFrame' && !url.hostname.endsWith(allowedHost)) {
      return callback({ cancel: true })
    }

    callback({ cancel: false })
  })

  mainWin.loadURL('https://fmfau.org/')

  mainWin.webContents.on('before-input-event', (event, input) => {
    if (
      (input.control || input.meta) &&
      (input.key.toLowerCase() === 'r' || input.key === 'F5')
    ) {
      event.preventDefault()
    }
  })

  mainWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  mainWin.webContents.on('new-window', event => event.preventDefault())

  mainWin.webContents.on('did-finish-load', () => {
    mainWin.webContents.insertCSS(`
      #window-controls {
        position: fixed;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 10px;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 9999;
        user-select: none;
      }
      #window-controls.visible {
        opacity: 1;
      }
      #window-controls button {
        width: 30px;
        height: 30px;
        background: rgba(0,0,0,0.5);
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        border-radius: 4px;
        outline: none;
      }
      #window-controls button:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      body {
        margin: 0;
      }
    `)

    mainWin.webContents.executeJavaScript(`
      const controls = document.createElement('div')
      controls.id = 'window-controls'
      controls.innerHTML = \`
        <button id="min-btn" title="Minimize">–</button>
        <button id="close-btn" title="Close">×</button>
      \`
      document.body.appendChild(controls)

      let timeout
      function showControls() {
        controls.classList.add('visible')
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          controls.classList.remove('visible')
        }, 2000)
      }

      window.addEventListener('mousemove', e => {
        if (e.clientY < 100 && e.clientX > window.innerWidth - 200) {
          showControls()
        }
      })

      document.getElementById('close-btn').addEventListener('click', () => {
        window.electronAPI.closeWindow()
      })

      document.getElementById('min-btn').addEventListener('click', () => {
        window.electronAPI.minimizeWindow()
      })
    `)
  })

  mainWin.on('closed', () => {
    mainWin = null
  })
}

app.whenReady().then(() => {
  createLoadingWindow()

  loadingWin.on('closed', () => {
    if (!mainWin) createMainWindow()
    if (mainWin) mainWin.show()
  })

  setTimeout(() => {
    if (loadingWin) loadingWin.close()
  }, 2000) // if you are reading this then yes the loading screen is 100% fake 🎅💤💤💤💤
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('window-close', e => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) win.close()
})

ipcMain.on('window-minimize', e => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) win.minimize()
})
