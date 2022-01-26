import type { VideoPlayer } from "./VideoPlayer";
import type { MediaControl } from "./MediaControl";

export interface ChanPlayerHTMLElementTagNameMap extends HTMLElementTagNameMap {
    'video-player': VideoPlayer;
    'media-control': MediaControl;
}
