export interface PlaylistItem {
    readonly path: string;
    readonly name: string;
    readonly metadata: Map<string, number|string|boolean|undefined>;
}

export interface PlaylistInterface {
    clear(): void;
    reset(): void;
    current(): PlaylistItem|undefined;
    previous(): PlaylistItem|undefined;
    next(): PlaylistItem|undefined;
}

class ShuffledPlaylist implements PlaylistInterface {
    private readonly items: PlaylistItem[] = [];
    private readonly readOrder: number[] = [];
    private cursor = -1;

    public constructor(items?: PlaylistItem[]) {
        this.items = items ? items : [];
    }

    public add(...items: PlaylistItem[]) {
        this.items.push(...items);
    }

    public clear() {
        this.readOrder.splice(0, this.readOrder.length);
        this.items.splice(0, this.items.length);
        this.cursor = -1;
    }

    public reset() {
        this.readOrder.splice(0, this.readOrder.length);
        this.cursor = -1;
    }

    public current(): PlaylistItem|undefined {
        if (this.cursor === -1) {
            return undefined;
        }
        return this.items[this.readOrder[this.cursor]];
    }

    public previous(): PlaylistItem|undefined {
        if (this.cursor < 1) {
            return;
        }
        this.cursor -= 1;
        return this.current();
    }

    public next(): PlaylistItem|undefined {
        if (this.items.length === 0) {
            return undefined;
        }
        this.cursor += 1;
        if (this.cursor < this.readOrder.length) {
            return this.current();
        }
        if (this.items.length <= this.cursor) {
            this.cursor = 0;
            return this.current();
        }
        const used = new Set(this.readOrder);
        const remainings = this.items.map((_0, i) => i).filter(i => !used.has(i));
        if (remainings.length === 0) {
            throw new Error('Invalid state error');
        }
        const idxToAdd = remainings[Math.trunc(Math.random()*remainings.length)];
        this.readOrder.push(idxToAdd);
        return this.current();
    }
}

class PlaylistLinear implements PlaylistInterface {
    private readonly items: PlaylistItem[];
    private cursor = -1;

    public constructor(items?: PlaylistItem[]) {
        this.items = items ? items : [];
    }

    public clear() {
        this.items.splice(0, this.items.length);
        this.cursor = -1;
    }

    public reset() {
        this.cursor = -1;
    }

    public previous() {
        if (this.items.length === 0) {
            this.cursor = -1;
            return undefined;
        }
        if (this.cursor < 1) {
            this.cursor = this.items.length;
        }
        this.cursor -= 1;
        return this.current();
    }

    public current() {
        return this.items[this.cursor];   
    }

    public next() {
        if (this.items.length === 0) {
            this.cursor = -1;
            return undefined;
        }
        this.cursor += 1;
        if (this.cursor === this.items.length) {
            this.cursor = 0;
        }
        return this.current();
    }

    public getIndex() {
        return this.cursor;
    }
}

export class PlaylistWrapper implements PlaylistInterface {
    private playlist: PlaylistInterface;
    private readonly items: PlaylistItem[];

    constructor(items: PlaylistItem[]) {
        this.items = items;
        this.playlist = new PlaylistLinear(items);
    }

    previous() {
        return this.playlist.previous();
    }

    current() {
        return this.playlist.current();
    }

    next() {
        return this.playlist.next();
    }

    toShuffle() {
        this.playlist = new ShuffledPlaylist(this.items);
        return this;
    }
    toLinear() {
        this.playlist = new PlaylistLinear(this.items);
        return this;
    }
    clear() {
        this.playlist.clear();
    }
    reset() {
        this.playlist.reset();
    }
}
