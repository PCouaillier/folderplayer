#! /usr/bin/env node
const { mkdir, readdir, access, copyFile } = require('fs');
const { join } = require('path');
const { promisify } = require('util');

const mkdirAsync = promisify(mkdir);
const readdirAsync = promisify(readdir);
const accessAsync = promisify(access);
const existsAsync = (path) => accessAsync(path).then(() => true, () => false);
const copyFileAsync = promisify(copyFile);

const createTargetDir = async (folderTarget) => {
    if (!(await existsAsync(folderTarget))) {
        await mkdirAsync(folderTarget, {recursive: true});
    }
}

const reqCopy = async (folderPath, folderTarget) => {
    const entries = await readdirAsync(folderPath, { withFileTypes: true });

    return Promise.all(
        entries.map(
            async entry => {
                if (entry.isDirectory()) {
                    const targetDir = join(folderTarget, entry.name);
                    await createTargetDir(targetDir);
                    await reqCopy(join(folderPath, entry.name), targetDir);
                }
                else if (!(/\.(?:ts|sass|scss)$/).exec(entry.name)) {
                    await copyFileAsync(join(folderPath, entry.name), join(folderTarget, entry.name));
                }
            }
        )
    );
};

const copyAssets = async () => {
    const distFront = join('dist', 'app-front');
    await createTargetDir(distFront);
    await reqCopy('asset', distFront);
};

const main = () => copyAssets();

main()
    .catch(console.error);
