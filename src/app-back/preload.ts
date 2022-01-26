///<reference path="../../node_modules/electron/electron.d.ts" />
import { ipcRenderer, contextBridge } from 'electron';
import { PathLike } from 'fs';
import { join, parse, ParsedPath } from 'path';

const fileExists = (path: string) => ipcRenderer.invoke('x-fs-exists', path) as Promise<boolean>;
const isDir = (path: string) => ipcRenderer.invoke('x-isdir', path) as Promise<boolean>;
const folderBrowser = () => ipcRenderer.invoke('x-choose-folder') as Promise<string|undefined>;
const listDirContent = (rootPath: string) => ipcRenderer.invoke('x-readdir', rootPath);
const deleteFile = (file: PathLike) => ipcRenderer.invoke('x-fs-delete', file);

export interface FileApi {
    fileExists: (path: string) => Promise<boolean>;
    folderBrowser: () => Promise<string|undefined>;
    isDir: (path: string) => Promise<boolean>;
    joinPath: (path: string, ...paths: string[]) => string;
    listDirContent: (rootPath: string) => Promise<string[]>;
    deleteFile: (file: PathLike) => Promise<void>;
    parsePath: (path: string) => ParsedPath,
}

contextBridge.exposeInMainWorld('fileApi', {
    fileExists,
    folderBrowser,
    isDir,
    joinPath: join,
    parsePath: parse,
    listDirContent,
    deleteFile
} as FileApi);
