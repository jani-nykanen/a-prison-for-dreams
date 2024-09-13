import { clamp } from "../math/utility.js";


export class AudioSample {


    // TODO: This might need some rewriting at some point


    private data : AudioBuffer;
    private activeBuffer : AudioBufferSourceNode | null = null;
    private gain : GainNode;

    private startTime : number = 0.0;
    private pauseTime : number = 0.0;
    private playVol : number = 0.0;
    private loop : boolean = false;


    constructor(ctx : AudioContext, data : AudioBuffer) {

        this.data = data;
        this.gain = ctx.createGain();
    }


    public play(ctx : AudioContext, vol : number = 1.0, loop : boolean = false, startTime : number = 0.0) : void {

        this.fadeIn(ctx, vol, vol, loop, startTime, 0);
    }


    public fadeIn(ctx : AudioContext, initial : number, end : number, 
        loop : boolean = false, startTime: number = 0, fadeTime: number = 0) : void {

        if (this.activeBuffer !== null) {

            this.activeBuffer.disconnect();
            this.activeBuffer = null;
        }

        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = this.data;
        bufferSource.loop = loop;

        initial = clamp(initial, 0.01, 1.0);
        end = clamp(end, 0.01, 1.0);

        this.gain.gain.setValueAtTime(initial, startTime);

        this.startTime = ctx.currentTime - startTime;
        this.pauseTime = 0;
        this.playVol = end;
        this.loop = loop;

        bufferSource.connect(this.gain).connect(ctx.destination);
        bufferSource.start(0, startTime);

        if (fadeTime > 0) {

            this.gain.gain.exponentialRampToValueAtTime(end, startTime + fadeTime/1000.0);
        }

        this.activeBuffer = bufferSource;
    }


    public stop() : void {

        if (this.activeBuffer === null) 
            return;

        this.activeBuffer.disconnect();
        this.activeBuffer.stop();
        this.activeBuffer = null;
    }


    public pause(ctx : AudioContext) : void {

        if (this.activeBuffer === null) 
            return;

        this.pauseTime = ctx.currentTime - this.startTime;
        this.stop();
    }


    public resume(ctx : AudioContext) : void {

        this.play(ctx, this.playVol, this.loop, this.pauseTime);
    }
}
