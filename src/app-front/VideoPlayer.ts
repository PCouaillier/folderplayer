import type { MediaControl } from "./MediaControl";

/* to include inside the html file
<!-- /// VIDEO PLAYER === -->
<template id="video-player-style-shadow">
	<style type="text/css">
		.video-player__text-crossed { text-decoration: line-through; }	
		.video-player__video { width: 100%; height: 100%; position: relative;}
		.media-control__controls {
			width: 100%;
			height:2.4rem;
			background-color: rgba(53, 30, 30, 0.4);
			vertical-align: middle;
			padding: 1px;
			overflow: hidden;
			display: none;
			position: fixed;
			bottom: 0;
			left: 0;
		}
		.media-control__controls:hover, .media-control__controls.hovered {
			display: block;
			margin-top: calc(-2.4rem - 2px);
			position: relative;
		}
	</style>
</template>
*/

const VIDEO_PROPERTIES = Object.freeze([
	'currentTime',
	'loop',
	'autoplay',
	'duration',
	'height',
	'muted',
	'onended',
	'poster',
	'preload',
	'disableRemotePlayback',
	'remote',
	'src',
	'srcObject',
	'width',
] as Array<keyof HTMLVideoElement>);

const VIDEO_PROPERTIES_READONLY = Object.freeze([
	'audioTracks',
	'audioTrackList',
	'buffered',
	'crossOrigin',
	'currentSrc',
	'defaultMuted',
	'defaultPlaybackRate',
	'ended',
	'error',
	'mediaKeys',
	'mozHasAudio',
	'networkState',
	'onencrypted',
	'onwaitingforkey',
	'paused',
	'playbackRate',
	'played',
	'readyState',
	'seekable',
	'seeking',
	'textTracks',
	'videoHeight',
	'videoWidth',
	'webkitAudioDecodedByteCount',
	'HAVE_CURRENT_DATA',
	'HAVE_ENOUGH_DATA',
	'HAVE_FUTURE_DATA',
	'HAVE_METADATA',
	'HAVE_NOTHING',
	'NETWORK_EMPTY',
	'NETWORK_IDLE',
	'NETWORK_LOADING',
	'NETWORK_NO_SOURCE',
] as Array<keyof HTMLVideoElement>);

const importStyles = (shadow: ShadowRoot) => {
	const shadowDomTemplate = document.getElementById('video-player-style-shadow') as undefined|HTMLTemplateElement;
	if (!shadowDomTemplate) {
		throw new Error('video-player-style-shadow is not in the document');
	}
	const shadowTemplate = document.importNode(shadowDomTemplate.content, true);
	const shadowStyles = shadowTemplate.querySelectorAll('style');
	const shadowStylesLength = shadowStyles.length;
	for (let i = 0; i < shadowStylesLength; i += 1) {
		shadow.appendChild(shadowStyles[i]);
	}
}

const createVideoPlayerElement = function(videoElement: HTMLVideoElement, player: VideoPlayer): VideoPlayer {

	const definePropertyFromVideoElement = (target: HTMLElement, prop: string, config: PropertyDescriptor) => {
		if (target.dataset[prop] !== undefined) {
			videoElement.setAttribute(prop, String(target.dataset[prop]));
		}
		if ((target as any)[prop] !== undefined && (videoElement as any)[prop] !== (target as any)[prop]) {
			(videoElement as any)[prop] = (target as any)[prop];
			delete (target as any)[prop];
		}
		Object.defineProperty(target, prop, config);
	}

	const bindVideoElement = () => {
		videoElement.classList.add('video-player__video');
		if (videoElement.parentNode && videoElement.parentNode !== player) {
			const parent = videoElement.parentNode;
			parent.insertBefore(player, videoElement);
			parent.removeChild(videoElement);
		}
		shadow.appendChild(videoElement);
		// videoElementBindings
		for(const property of VIDEO_PROPERTIES) {
			
			definePropertyFromVideoElement(player, property, {
				get: function() {
					return videoElement[property];
				},
				set: function(value: HTMLVideoElement[typeof property]) {
					(videoElement as any)[property] = value;
				},
			});
		}
		for(const property of VIDEO_PROPERTIES_READONLY) {
			definePropertyFromVideoElement(player, property, {
				get: function() {
					return videoElement[property];
				}
			});
		}
		if ((player as any).hasAudio === undefined) {
			Object.defineProperty(player, 'hasAudio', {
				get: function() { 
					Promise.race([
						new Promise((resolve) =>
							void videoElement.addEventListener('loadedmetadata', () =>
								void resolve(true)
							)
						),
						new Promise(function waitLoad(resolve) {
							if (!player.hasLoaded) {
								setTimeout(() => waitLoad(resolve), 50);
							}
							resolve(true);
						}),
					]).then(() => (videoElement as any).mozHasAudio ||
						Boolean((videoElement as any).webkitAudioDecodedByteCount) ||
						Boolean((videoElement as any).audioTracks && (videoElement as any).audioTracks.length) ||
						Boolean((videoElement as any).audioTrackList && (videoElement as any).audioTrackList.length) 
					);
				}
			});
		}
	}
	Object.defineProperty(player, 'hasLoaded', {
		get: () => !isNaN(videoElement.duration) || 1 < videoElement.seekable.length,
	});
	Object.defineProperty(player, 'controls', {
		get: () => true,
		set: () => {},
	});
	if (videoElement.style.width) {
		player.style.width = videoElement.style.width;
		videoElement.style.width = '';
	}
	if (videoElement.style.height) {
		player.style.height = videoElement.style.height;
		videoElement.style.height = '';
	}
	if (videoElement.controls) {
		videoElement.controls = false;
	}
	player.classList.add('video-player');
	const shadow = player.attachShadow({mode: 'closed'});
	importStyles(shadow);
	bindVideoElement();
	
	// createVideoControls
	const videoControl = document.createElement('media-control') as MediaControl;
	definePropertyFromVideoElement(player, 'volume', {
		get: () => videoElement.volume,
		set : (value) => {
			if (videoElement.volume !== value) {
				videoElement.volume = value;
				videoControl.volume = value;
			}
		}
	});

	let fullScreen = false;
	player.addEventListener('dblclick', async (ev: MouseEvent) => {
		ev.stopPropagation();
		if (!fullScreen) {
			await player.requestFullscreen();
			fullScreen = true;
		} else {
			await document.exitFullscreen();
			fullScreen = false;
		}
	});
	(player as any)._addEventListener = player.addEventListener;
	player.addEventListener = function addEventListener(name: string, func: (evt: Event)=>void, options?: AddEventListenerOptions) {
		if ([
			'canplay',
			'canplaythrough',
			'durationchange',
			'emptied',
			'ended',
			'loadedmetadata',
			'loadeddata',
			'pause',
			'play'
		].includes(name)) {
			videoElement.addEventListener(name, func, options);
		} else {
			(player as any)._addEventListener(name, func, options);
		}
	}
	videoControl.bindVideo(player)
	shadow.appendChild(videoControl);
	return player;
};

/**
 * fields are binded using createVideoPlayer
 */
export class VideoPlayer extends HTMLElement implements HTMLMediaElement {
	public autoplay!: boolean;
	public loop!: boolean;
	public volume!: number;
	public muted!: boolean;
	public currentTime!: number;
	public preload!: ""|"metadata"|"none";
	public poster!: string | undefined;
	public controls!: true;
	public height!: number;
	public width!: number;
	public disableRemotePlayback!: boolean;
	public videoControl!: MediaControl|undefined;
    public readonly remote!: any;
	public readonly duration!: number;
	public readonly hasAudio!: boolean;
	public readonly hasLoaded!: boolean;
	public readonly paused!: boolean;
	public readonly videoHeight!: number | undefined;
	public readonly videoWidth!: number | undefined;
	public readonly mozHasAudio!: boolean | undefined;
	public readonly webkitAudioDecodedByteCount!: number;
	public readonly audioTracks!: MediaStreamTrack[];
	public readonly audioTrackList!: MediaStreamTrack[];
	public readonly buffered!: TimeRanges;
	public readonly crossOrigin!: string | null;
	public readonly currentSrc!: string;
	public readonly defaultMuted!: boolean;
	public readonly defaultPlaybackRate!: number;
	public readonly ended!: boolean;
	public readonly error!: MediaError | null;
	public readonly mediaKeys!: MediaKeys | null;
	public readonly networkState!: number;
	public readonly onencrypted: ((this: HTMLMediaElement, ev: MediaEncryptedEvent) => any) | null;
	public readonly onwaitingforkey: ((this: HTMLMediaElement, ev: Event) => any) | null;
	public readonly playbackRate!: number;
	public readonly played!: TimeRanges;
	public readonly readyState!: number;
	public readonly seekable!: TimeRanges;
	public readonly seeking!: boolean;
	public readonly srcObject!: MediaStream | MediaSource | Blob | null;
	public readonly textTracks!: TextTrackList;
	public readonly HAVE_CURRENT_DATA!: 2;
	public readonly HAVE_ENOUGH_DATA!: 4;
	public readonly HAVE_FUTURE_DATA!: 3;
	public readonly HAVE_METADATA!: 1;
	public readonly HAVE_NOTHING!: 0;
	public readonly NETWORK_EMPTY!: 0;
	public readonly NETWORK_IDLE!: 1;
	public readonly NETWORK_LOADING!: 2;
	public readonly NETWORK_NO_SOURCE!: 3;

	public static get observedAttributes() {
		return [
			'data-src',
			'data-loop',
			'data-volume',
			'data-muted',
			'data-preload',
			'data-poster',
			'data-autoplay',
			'data-disableRemotePlayback',
		]
	}

	private readonly videoElement: HTMLVideoElement;
	private initialized: boolean = false;

	public constructor() {
		super();
		const videoElement = this.querySelector('video');
		this.videoElement = videoElement ? videoElement : document.createElement('video');
		if (this.videoElement.onencrypted) {
			this.onencrypted = (ev: MediaEncryptedEvent) => {
				if (this.videoElement.onencrypted) {
					this.videoElement.onencrypted(ev);
				}
			}
		} else {
			this.onencrypted = null;
		}
		if (this.videoElement.onwaitingforkey) {
			this.onwaitingforkey = (ev: Event) => {
				if (this.videoElement.onwaitingforkey) {
					this.videoElement.onwaitingforkey(ev);
				}
			}
		} else {
			this.onwaitingforkey = null;
		}
	}

	public get src() {
		return this.videoElement.src;
	}

	public set src(value) {
		this.videoElement.src = value;
	}

	public play() {
		return this.videoElement.play();
	}

	public pause() {
		return this.videoElement.pause();
	}

	public getVideoPlaybackQuality(): VideoPlaybackQuality {
		return this.videoElement.getVideoPlaybackQuality();
	}

	public addTextTrack(kind: TextTrackKind, label?: string, language?: string): TextTrack {
		return this.videoElement.addTextTrack(kind, label, language);
	}
	public canPlayType(type: string): CanPlayTypeResult {
		return this.videoElement.canPlayType(type);
	}
	public fastSeek(time: number): void {
		return this.videoElement.fastSeek(time);
	}
	public load(): void {
		return this.videoElement.load();
	}
	public setMediaKeys(mediaKeys: MediaKeys | null): Promise<void> {
		return this.videoElement.setMediaKeys(mediaKeys);
	}

	public connectedCallback() {
		if (this.initialized) {
			return;
		}
		this.initialized = true;
		VideoPlayer.observedAttributes.forEach(attribute => {
			const val = this.getAttribute(attribute);
			if (val !== null && val !== undefined) {
				this.videoElement.setAttribute(attribute, val);
			}
		});
		createVideoPlayerElement(this.videoElement, this);
	}
}
