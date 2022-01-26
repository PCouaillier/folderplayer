import type { PlaylistItem } from './Playlist';
import { VideoPlayer } from './VideoPlayer';
import { PlaylistWrapper } from './Playlist';

export interface MediaPlayerElement {
    name: string,
    url: string,
    ext: string,
}

export const MediaPlayer = (() => {
    const ALLOWED_VIDEO_EXT = Object.freeze(['mp4', 'webm', 'flv', 'mov']);

    const getName = (elem: HTMLMediaElement) => {
        let name = '';
        if (elem.src) {
            const nameReg = (/([^/]*)$/).exec(elem.src);
            if (nameReg) {
                return nameReg[0];
            }
        }
        if (elem.title !== undefined && elem.title !== null && elem.title.trim() !== '') {
            name = elem.title.trim();
            if (name !== '')
                return name;
        }
        name = elem.innerHTML.trim();
        return name;
    }

    const isVideo = (el: string|{ext: string}) => {
        return ALLOWED_VIDEO_EXT.includes(
            (typeof el === 'string' ? el : el.ext ? el.ext : '')
            .toLowerCase()
        );
    }

    const getExt = (name: string) => {
        const spliced = name.split(/\./g);
        const ext = spliced[spliced.length - 1].trim();
        return ext !== '' ? ext : undefined;
    }

    const createPlayerContainer = (document: Document) => {
        const existingContainers = document.getElementsByClassName('chan-player-container');
        if (existingContainers.length !== 0) {
            return existingContainers[0] as HTMLDivElement;
        }
        const playerContainer = document.createElement('div');
        playerContainer.classList.add('chan-player-container');
        playerContainer.hidden = true;
        document.body.appendChild(playerContainer);
        return playerContainer;
    }

    const hasOwnProperty = (obj: Object, prop: string) => Object.prototype.hasOwnProperty.call(obj, prop);

    return class MediaPlayer {
        private _volume: number = 0.2;
        private readonly document: Document;
        private readonly playerContainer: HTMLDivElement;
        private playlist: PlaylistWrapper;
        private keyDownListener: (e: KeyboardEvent)=>void;
        private timer?: number;
        private onBeforeChange?: () => void;
        private player?: VideoPlayer|HTMLMediaElement|HTMLImageElement|HTMLDivElement;
        private loop: boolean = false;
        private fullScreen = false;

        public static fromDom(document: Document, elementsSelector: string): MediaPlayer {
            const anchors = document.querySelectorAll(elementsSelector);
            const playlistElems: PlaylistItem[] = [];
            for (let i = 0; i < anchors.length; i += 1) {
                const elem = anchors[i] as HTMLMediaElement;
                const name = getName(elem);
                const ext = getExt(name);
                const url = (elem as any).href
                    ? (elem as any).href
                    : elem.src;
                playlistElems.push({
                    name: name,
                    path: url,
                    metadata: new Map([['ext', ext]]),
                });
            }
            return new MediaPlayer(document, playlistElems);
        }

        public constructor(document: Document, playlist: PlaylistItem[]) {
            this.playlist = new PlaylistWrapper(playlist).toShuffle();
            this.document = document;
            this.playerContainer = createPlayerContainer(document);
            this.playerContainer.addEventListener('dblclick', (ev: MouseEvent) => {
                ev.stopPropagation();
                return this.onOffFullScreen();
            }, {capture: true});
            const actions = {
                arrowleft: () => this.previous(),
                arrowright: () => this.next(),
                arrowup: () => {
                    if (this.volume >= 1) {
                        return;
                    }
                    if (this.volume < 0.9) {
                        this.volume += 0.1;
                    }
                    else {
                        this.volume = 1;
                    }
                    const elem = this.playerContainer.firstElementChild as undefined|HTMLMediaElement;
                    if (elem && elem.volume !== undefined) {
                        elem.volume = this.volume;
                    }
                },
                arrowdown: () => {
                    if (0 < this.volume) {
                        if (this.volume < 0.1) {
                            this.volume = 0;
                        }
                        else {
                            this.volume -= 0.1;
                        }
                        const elem = this.playerContainer.firstElementChild as undefined|HTMLMediaElement; 
                        if (elem && elem.volume !== undefined) {
                            elem.volume = this.volume;
                        }
                    }
                },
                d: () => {
                    if (this.playerContainer.classList.contains('mobile-def')) {
                        this.playerContainer.classList.remove('mobile-def');
                    }
                    else {
                        this.playerContainer.classList.add('mobile-def');
                    }
                },
                r: (event: KeyboardEvent) => {
                    if (event.shiftKey) {
                        if (this.playerContainer.classList.contains('rotate-negate')) {
                            this.playerContainer.classList.remove('rotate-negate');
                            this.playerContainer.classList.remove('rotate');
                        }
                        else {
                            this.playerContainer.classList.add('rotate-negate');
                            if (!this.playerContainer.classList.contains('rotate')) {
                                this.playerContainer.classList.add('rotate');
                            }
                        }
                    }
                    else {
                        if (this.playerContainer.classList.contains('rotate')) {
                            this.playerContainer.classList.remove('rotate');
                        }
                        else {
                            this.playerContainer.classList.add('rotate');
                        }
                        if (this.playerContainer.classList.contains('rotate-negate')) {
                            this.playerContainer.classList.remove('rotate-negate');
                        }
                    }
                },
                l: () => {
                    this.loop = !this.loop;
                    if (this.player) {
                        (this.player as any).loop = this.loop;
                    }
                },
                f: () => this.onOffFullScreen(),
                ' ': async () => {
                    if (this.player && hasOwnProperty(this.player, 'hasAudio')) {
                        if ((this.player as VideoPlayer).paused) {
                            await (this.player as VideoPlayer).play();
                        } else {
                            (this.player as VideoPlayer).pause();
                        }
                    }
                }
            };
            this.keyDownListener = async (e) => {
                if (e && e.ctrlKey) {
                    return;
                }
                const key = e.key ? e.key.toLowerCase() : undefined;
                if (key && key.toLowerCase() === 'escape') {
                    this.playerContainer.hidden = !this.playerContainer.hidden;
                    if (!this.playerContainer.hidden) {
                        this.document.body.classList.add('no-overflow');
                        let elem = this.playlist.current()
                        if (elem === undefined) {
                            elem = this.playlist.next();
                        }
                        if (elem !== undefined) {
                            this.createPlayer({
                                ext: elem.metadata.get('ext') as string,
                                name: elem.name,
                                url: elem.path,
                            });
                        }
                    } else {
                        this.document.body.classList.remove('no-overflow');
                    }
                }
                else if (!this.playerContainer.hidden && key && hasOwnProperty(actions, key)) {
                    e.preventDefault();
                    e.stopPropagation();
                    await actions[key as keyof typeof actions](e);
                }
            };
            this.document.addEventListener('keydown', this.keyDownListener, {capture: true});
        }

        public setTimmer(f: ()=>void, n: number) {
            if (this.timer) {
                clearTimeout(this.timer);
            }
            this.timer = setTimeout(f, n) as any as number;
        }
        
        public hasAudio() {
            const video = this.playerContainer.firstElementChild as any;
            return video !== undefined && (
                video.mozHasAudio ||
                Boolean(video.webkitAudioDecodedByteCount) ||
                (video.audioTracks && video.audioTracks.length)
            );
        }
        
        public previous() {
            if (this.timer !== undefined) {
                clearTimeout(this.timer);
                this.timer = undefined;
            }
            if (this.onBeforeChange) {
                const c = this.onBeforeChange;
                this.onBeforeChange = undefined;
                c();
            }
            const playEl = this.playlist.previous();
            if (!playEl) { return; }
            const el = {
                name: playEl.name,
                url: playEl.path,
                ext: playEl.metadata.get('ext') as string,
            }
            this.createPlayer(el);
        }
        
        public next() {
            if (this.timer !== undefined) {
                clearTimeout(this.timer);
                this.timer = undefined;
            }
            if (this.onBeforeChange) {
                const c = this.onBeforeChange;
                this.onBeforeChange = undefined;
                c();
            }
            this.player = this.playerContainer.firstElementChild as undefined|HTMLMediaElement;
            if (this.player && (this.player as any).mozHasAudio) {
                this.volume = this.player.volume;
            }
            const playEl = this.playlist.next();
            if (!playEl) { return; }
            const el = {
                name: playEl.name,
                url: playEl.path,
                ext: playEl.metadata.get('ext') as string,
            }
            this.createPlayer(el);
        }
        
        public createPlayer(element: MediaPlayerElement) {
            while (this.playerContainer.children.length !== 0) {
                this.playerContainer.removeChild(this.playerContainer.children[0]);
            }
            if (isVideo(element.ext)) {
                const player = this.player = document.createElement('video-player') as VideoPlayer;
                player.classList.add('element-player__video')
                player.src = element.url;
                player.loop = this.loop;
                player.onended = () => this.next();
                player.controls = true;
                player.volume = this.volume;
                player.loop = this.loop;
                player.play();
            }
            else if (['png', 'jpg', 'jpeg'].includes(element.ext) && !element.url.includes('@')) {
                const player = this.player = document.createElement('div');
                player.classList.add('img', 'element-player__img');
                player.style.backgroundImage = 'url("' + encodeURI(element.url) + '")';
                this.setTimmer(() => {
                    if (player !== this.playerContainer.children[0]) {
                        return;
                    }
                    this.next();
                }, 3000);
            }
            else if (['gif', 'webp', 'png', 'jpg', 'jpeg'].includes(element.ext)) {
                const player = this.player = document.createElement('img');
                player.src = element.url;
                player.addEventListener('load', () => {
                    if (player !== this.player) {
                        return;
                    }
                    this.onBeforeChange = () => {
                        if (this.player) {
                            this.player.style.height = '';
                            this.player.style.width = '';
                        }
                    };
                    if (!this.player || !this.player.parentElement) {
                        console.debug('Player is undefined');
                        return;
                    }
                    const oldHeight = (this.player as any).height;
                    const oldWidth = (this.player as any).width;
                    const parentElement = this.player.parentElement;
                    const ratio = Math.min(parentElement.offsetHeight / oldHeight, parentElement.offsetWidth / oldWidth);
                    this.player.style.height = (oldHeight * ratio) + 'px';
                    this.player.style.width = (oldWidth * ratio) + 'px';
                    this.setTimmer(() => {
                        if (player !== this.playerContainer.children[0]) {
                            return;
                        }
                        this.next();
                    }, 3000);
                });
            }
            else {
                console.debug({ message: 'unkown extension', element });
                const player = this.player = document.createElement('img');
                player.classList.add('img', 'element-player__img');
                player.src = element.url;
                this.setTimmer(() => {
                    if (player !== this.player) {
                        return;
                    }
                    this.next();
                }, 3000);
            }
            if (this.player) {
                this.player.classList.add('chan-player-container__element')
                this.playerContainer.appendChild(this.player);
            }
        }

        public close() {
            if (this.timer) {
                clearTimeout(this.timer);
            }
            this.document.removeEventListener('keydown', this.keyDownListener, {capture: true});
            if (this.player && this.player.parentElement) {
                this.player.parentElement.removeChild(this.player);
            }
            this.player = undefined;
            this.timer = undefined;
            this.onBeforeChange = undefined;
            this.playlist.clear();
        }

        private async onOffFullScreen() {
            if (!this.fullScreen) {
                await this.playerContainer.requestFullscreen();
                this.fullScreen = true;
            } else {
                await document.exitFullscreen();
                this.fullScreen = false;
            }
        }

        private get volume() {
            return this._volume;
        }

        private set volume(volume) {
            if (this._volume === volume) {
                return;
            }
            this._volume = volume;
            if (this.player) {
                (this.player as HTMLMediaElement).volume = this._volume;
            }
        }
    }
})();
