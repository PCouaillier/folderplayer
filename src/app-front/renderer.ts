import type { FileApi } from "../app-back/preload";
import { MediaControl } from "./MediaControl";
import { VideoPlayer }  from "./VideoPlayer";

declare const fileApi: FileApi;

customElements.define('media-control', MediaControl);
customElements.define('video-player', VideoPlayer);

const {
    parsePath,
    joinPath,
    folderBrowser,
    listDirContent,
    deleteFile,
} = fileApi;

const readDir = () =>
    folderBrowser()
    .then((path) => {
        if (!path) {
            return [];
        }
        return listDirContent(path)
            .then(files =>
                files.filter(f => /\.mp4$/.exec(f))
                .map(p => joinPath(path, p))
                .sort(() => Math.random() - 0.5)
            );
    });

let indexVideo = 0;
let videos: string[] = [];

(() => {
    let lock = false;

    document.addEventListener('keydown', (ev) => {
        if (lock) {
            return;
        }
        lock = true;
        const player = document.getElementById('main-video-player') as VideoPlayer;
        switch(ev.key) {
            case 'Delete':
                const videoToDelete = videos[indexVideo];
                if (confirm(videoToDelete)) {
                    console.log('deleting ' + videoToDelete);
                    videos.splice(indexVideo, 1);
                    if (videos.length === indexVideo) {
                        indexVideo -= 1;
                    }
                    setTimeout(() => player.src = 'file://' +videos[indexVideo].replace(/\\/g, '/'), 5);
                    setTimeout(() => deleteFile(videoToDelete).catch(e => console.error(e, parsePath(videoToDelete))), 200);
                }
                break;
            case 'ArrowLeft':
                indexVideo-=1;
                if (indexVideo < 0) {
                    indexVideo = videos.length - 1;
                }
                setTimeout(() => player.src = 'file://' +videos[indexVideo].replace(/\\/g, '/'),5);
                break;
            case 'ArrowRight':
                indexVideo += 1;
                if (videos.length <= indexVideo) {
                    indexVideo = 0;
                }
                setTimeout(() => player.src = 'file://' +videos[indexVideo].replace(/\\/g, '/'),5);
                break;
        }
        lock = false;
    });
})();

readDir()
    .then((_videos) => {
        if (_videos.length === 0) {
            console.debug({message: 'folder has no video', _videos});
            return;
        }
        indexVideo = 0;
        videos = _videos;
        const player = document.getElementById('main-video-player') as VideoPlayer;
        console.log(_videos);
        setTimeout(() => player.src = 'file://' +videos[0].replace(/\\/g, '/'),5);
    })
