import { clamp } from "../math/utility.js";


const MINIMUM_VOLUME : number = 0.001;


export class AudioSample {


    // TODO: This might need some rewriting at some point


    private data : AudioBuffer;
    private activeBuffer : AudioBufferSourceNode | undefined = undefined; // TODO: undefined, maybe?
    private gain : GainNode;

    private startTime : number = 0.0;
    private pauseTime : number = 0.0;
    private baseVolume : number = 0.0;
    private loop : boolean = false;


    constructor(ctx : AudioContext, data : AudioBuffer) {

        this.data = data;
        this.gain = ctx.createGain();
    }


    public play(ctx : AudioContext, volume : number = 1.0, volumeModifier : number = 1.0,
        loop : boolean = false, startTime : number = 0.0) : void {

        this.fadeIn(ctx, volume, volume, volumeModifier, loop, startTime, 0);
    }


    public fadeIn(ctx : AudioContext, 
        initial : number, end : number, volumeModifier : number,
        loop : boolean = false, startTime: number = 0, fadeTime: number = 0) : void {

        this.activeBuffer?.disconnect();
        this.activeBuffer = undefined;

        const bufferSource : AudioBufferSourceNode = ctx.createBufferSource();
        bufferSource.buffer = this.data;
        bufferSource.loop = loop;

        this.baseVolume = end;

        initial = clamp(initial*volumeModifier, MINIMUM_VOLUME, 1.0);
        end = clamp(end*volumeModifier, MINIMUM_VOLUME, 1.0);

        this.gain.gain.setValueAtTime(initial, startTime);

        this.startTime = ctx.currentTime - startTime;
        this.pauseTime = 0;
        this.loop = loop;

        bufferSource.connect(this.gain).connect(ctx.destination);
        bufferSource.start(0, startTime);

        if (fadeTime > 0) {

            this.gain.gain.exponentialRampToValueAtTime(end, startTime + fadeTime/1000.0);
        }

        this.activeBuffer = bufferSource;
    }


    public stop() : void {

        this.activeBuffer?.disconnect();
        this.activeBuffer?.stop();
        this.activeBuffer = undefined;
    }


    public pause(ctx : AudioContext) : void {

        if (this.activeBuffer === undefined)  {

            return;
        }

        this.pauseTime = ctx.currentTime - this.startTime;
        this.stop();
    }


    public resume(ctx : AudioContext, volumeModifier : number) : void {

        this.play(ctx, this.baseVolume, volumeModifier, this.loop, this.pauseTime);
    }


    public changeVolume(ctx : AudioContext, newVolume : number) : void {

        if (this.activeBuffer === undefined)  {
            
            return;
        }

        this.gain.gain.setValueAtTime(clamp(this.baseVolume*newVolume, MINIMUM_VOLUME, 1.0), ctx.currentTime);
    }
}
