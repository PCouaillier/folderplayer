import { promisify } from 'util';
import fs, { PathLike } from 'fs';
import { dialog, ipcMain, nativeTheme, BrowserWindow } from 'electron';
import path from 'path';
import type { Context } from './Context';

const accessAsync = promisify(fs.access);
const existsAsync = (path: string) => accessAsync(path).then(() => true, () => false)
const deleteAsync = promisify(fs.unlink);
const wait = promisify((time: number, cb: (...params: any)=>void) => void setTimeout(cb, time));

export const bindIpc = (context: Context) => {

    ipcMain.handle('dark-mode:toggle', () => {
        if (nativeTheme.shouldUseDarkColors) {
            nativeTheme.themeSource = 'light'
        } else {
            nativeTheme.themeSource = 'dark'
        }
        return nativeTheme.shouldUseDarkColors
    })

    ipcMain.handle('dark-mode:system', () => {
        nativeTheme.themeSource = 'system'
    });

    // In this file you can include the rest of your app's specific main process
    // code. You can also put them in separate files and import them here.
    ipcMain.handle('x-choose-folder', async () => {
        if (!context.mainWindow) {
            return;
        }
        const result = await dialog.showOpenDialog(context.mainWindow, { properties: ['openDirectory'] });
        return result.filePaths && result.filePaths.length ? result.filePaths[0] : undefined;
    });

    ipcMain.handle('x-readdir', (_event: Event, path: string) => new Promise((resolve, reject) => void fs.readdir(path, (err, files) => void (err ? reject(err) : resolve(files)))));

    ipcMain.handle('x-isdir', (_event: Event, path: string) => new Promise((resolve, reject) => void fs.stat(path, (err, stats) => void (err ? reject(err) : resolve(stats.isDirectory())))));

    ipcMain.handle('x-fs-exists',
        (_event: Event, path: string) => existsAsync(path.replace(/\\/g, '/'))
    );

    ipcMain.handle('x-fs-delete', (_event: Event, path: PathLike) => deleteAsync(path).catch(() => wait(1000).then(() => deleteAsync(path))));
};
