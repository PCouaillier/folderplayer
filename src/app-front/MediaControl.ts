/* to include inside the html file
<!-- /// MEDIA CONTROLS === -->
<template id="media-control-style-shadow">
    <style type="text/css">
        .media-control__control { margin: 0; padding: 0; display: inline-block; }
        .media-control__name { display: block; width: 100%; height: 1rem; text-align: center; overflow: hidden; }
        .media-control__volume { width: 5rem; }
        .media-control__btn-play, .media-control__btn-pause { width: 3.5rem; }
        .media-control__btn-loop { width: 3rem; }
        .media-control__time-code { width: calc(100% - 3.5rem - 3rem - 3px - 5rem); }
        .media-control__time-code::-moz-progress-bar { background-color: #6495ED; }
        .media-control__time-code::-webkit-progress-bar { background-color: #6495ED; }
        .media-control__time-code::progress-bar { background-color: #6495ED; }
        .hidden, [hidden] { display: none !important; }
    </style>
</template>
<!-- === MEDIA CONTROLS /// -->
*/

const importStyles = (shadow: ShadowRoot) => {
	const shadowDomTemplate = document.getElementById('media-control-style-shadow') as undefined|HTMLTemplateElement;
	if (!shadowDomTemplate) {
		throw new Error('media-control-style-shadow is not in the document');
	}
	const shadowTemplate = document.importNode(shadowDomTemplate.content, true);
	const shadowStyles = shadowTemplate.querySelectorAll('style');
	const shadowStylesLength = shadowStyles.length;
	for (let i = 0; i < shadowStylesLength; i += 1) {
		shadow.appendChild(shadowStyles[i]);
	}
}


export class MediaControl extends HTMLElement {
    private initialized: boolean = false;

    /** _videoName use used though get/set videoName*/
    private _videoName?: string;
    private labelName!: HTMLDivElement;
    private progressBar!: HTMLProgressElement;
    private btnPlay!: HTMLButtonElement;
    private btnPause!: HTMLElement;
    private btnLoop!: HTMLButtonElement;
    private mediaElement!: HTMLMediaElement;
    private volumeControl!: HTMLProgressElement;
    private refreshProgressBarInterval: undefined|number = undefined;
    private refreshProgressBar = () => {this.progressBar.value = this.mediaElement.currentTime;};
    private readonly shadow: ShadowRoot;

    public static get observedAttributes() {
		return [
			'data-videoName',
		]
	}

    public get videoName(): undefined|string {
        return this._videoName;
    }

    public set videoName(value: undefined|string) {
        this._videoName = value;
        this.labelName.innerText = value ? value : '';
    }

	public constructor() {
		super();
        
    	this.shadow = this.attachShadow({mode: 'closed'});
	    importStyles(this.shadow);
    }

    public async play() {
        if (!this.mediaElement) {
            return;
        }
        this.btnPlay.classList.add('hidden');
        this.btnPause.classList.remove('hidden');
        if (this.mediaElement.paused) {
            await this.mediaElement.play();
        }
        setInterval(this.refreshProgressBar, 100);
    }

    public pause() {
        if (this.mediaElement) {
            this.btnPlay.classList.remove('hidden');
            this.btnPause.classList.add('hidden');
            if (!isNaN(this.mediaElement.duration)) {
                this.progressBar.max = this.mediaElement.duration;
            }
            this.progressBar.value = this.mediaElement.currentTime;
            if (!this.mediaElement.paused) {
                this.mediaElement.pause();
            }
        }
        if (this.refreshProgressBarInterval) {
          clearInterval(this.refreshProgressBarInterval);
        }
    }

    public bindVideo(element: HTMLMediaElement) {
        if (!this.initialized) {
            this.connectedCallback();
        }
        this.mediaElement = element;
        this.labelName.innerText = element.src;

        // progressBar
        element.addEventListener('loadedmetadata', () => {
			if (!isNaN(element.duration)) {
				this.progressBar.max = element.duration;
			}
            if (element.paused) {
                this.btnPlay.classList.remove('hidden');
                this.btnPause.classList.add('hidden');
            }
            if (!this._videoName) {
                this.labelName.innerText = decodeURI(element.src);
            }
		}, {passive: true});
		this.progressBar.addEventListener('click', (evt: MouseEvent) => {
			evt.stopPropagation();
            const durationPercent = element.duration ? element.duration : 1;
			this.currentTime = (evt.x - this.progressBar.offsetLeft) / this.progressBar.offsetWidth * durationPercent;
		});
        
        // btnLoop
		this.loop = element.loop;
        this.btnLoop.addEventListener('click', (evt: MouseEvent) => {
			evt.stopPropagation();
			this.loop = !element.loop;
		});

        // volumeControl
		if (element.volume !== undefined) {
			this.volume = element.volume;
		}
        this.volumeControl.addEventListener('click', (evt: MouseEvent) => {
			evt.stopPropagation();
            const volume = (evt.x - this.volumeControl.offsetLeft) / (this.volumeControl.clientWidth - 2);
			this.volume = Math.min(Math.max(volume, 0), 1);
		});
		this.volumeControl.classList.add('media-control__control', 'media-control__volume');

		const playPause = async (evt: Event) => {
			evt.stopPropagation();
			try {
				if (element.paused) {
					await this.play();
				} else {
					this.pause();
				}
			} catch(error) {
				console.error(error);
			}
		};
		this.btnPlay.addEventListener('click', playPause, {passive: true});
		this.btnPause.addEventListener('click', playPause, {passive: true});
		element.addEventListener('click', playPause, {passive: true});
		element.addEventListener('pause', () => this.pause(), {passive: true});
		element.addEventListener('play', () => this.play(), {passive: true});

        // hovered
        element.addEventListener('mouseover', () => {
			this.classList.add('hovered');
		}, {capture:true, passive: true});
		element.addEventListener('mouseout', () => {
			this.classList.remove('hovered');
		}, {capture:true, passive: true});
    }

    public get loop() {
        return this.mediaElement.loop;
    }
    public set loop(value) {
        this.mediaElement.loop = value;
        if (value) {
            this.btnLoop.classList.remove('video-player__text-crossed');
        } else {
            this.btnLoop.classList.add('video-player__text-crossed');
        }
    }

    public get volume() {
        return this.mediaElement.volume;
    }
    public set volume(value) {
        this.mediaElement.volume = value;
        this.volumeControl.value = value;
    }

    public get currentTime() {
        if (this.mediaElement) {
            return this.mediaElement.currentTime;
        }
        return this.progressBar.value;
    }
    public set currentTime(value) {
        if (this.mediaElement) {
            this.mediaElement.currentTime = value;
        }
        if (this.progressBar.max < value) {
            this.progressBar.max = value;
        }
        this.progressBar.value = value;
    }

    public connectedCallback() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        this.classList.add('media-control__controls');
        this.labelName = document.createElement('div');
        this.labelName.classList.add('media-control__control', 'media-control__name');

        this.btnPlay = document.createElement('button');
        this.btnPlay.classList.add('media-control__control', 'media-control__btn-play');
        this.btnPlay.innerText = 'play';

        this.btnPause = document.createElement('button');
        this.btnPause.classList.add('media-control__control', 'media-control__btn-pause');
        this.btnPause.classList.add('hidden');
        this.btnPause.innerText = 'pause';

        this.progressBar = document.createElement('progress');
        this.progressBar.classList.add('media-control__control', 'media-control__time-code');
        this.progressBar.setAttribute('value', '0');
        this.progressBar.setAttribute('max', '100');
    
        this.btnLoop = document.createElement('button');
        this.btnLoop.innerText = 'loop';
        this.btnLoop.classList.add('media-control__control', 'media-control__btn-loop');

        this.volumeControl = document.createElement('progress');
        this.volumeControl.max = 1;

        const div = document.createElement('div');
        div.append(this.btnPlay, this.btnPause, this.progressBar, this.btnLoop, this.volumeControl)
        this.shadow.append(this.labelName, div);
		this.addEventListener('click', (evt: MouseEvent) => {evt.stopPropagation();});
    }
}
