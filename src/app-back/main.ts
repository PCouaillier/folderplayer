///<reference path="../../node_modules/electron/electron.d.ts" />
import { app, BrowserWindow } from 'electron';
import { bindIpc } from './IpcMapper';
import path from 'path';
import type { Context } from './Context';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const context: Context = {
    mainWindow: null,
};

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            devTools: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true
    });

    context.mainWindow = mainWindow;
    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/../app-front/index.xhtml`);

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        context.mainWindow = null;
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    bindIpc(context);
    createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (context.mainWindow === null) {
        createWindow();
    }
});
