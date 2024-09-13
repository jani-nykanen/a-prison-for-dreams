import { AudioSample } from "./sample.js";


export class AudioPlayer {

    protected ctx : AudioContext;
    private musicTrack : AudioSample | undefined = undefined;

    private globalVolume : number;
    // private enabled : boolean = false;

    private sfxEnabled : boolean = true;
    private musicEnabled : boolean = true;


    constructor(ctx : AudioContext, globalVolume : number = 1.0) {

        this.ctx = ctx;
        this.globalVolume = globalVolume;
    }


    public playSample(sample : AudioSample | undefined, vol : number = 1.0) : void {

        const EPS : number = 0.001;

        if (this.ctx === undefined ||
            !this.sfxEnabled || 
            sample === undefined || 
            this.globalVolume*vol <= EPS) {

            return;
        }

        sample.play(this.ctx, this.globalVolume*vol, false, 0);
    }


    public playMusic(sample : AudioSample | undefined, vol : number = 1.0) : void {

        if (!this.musicEnabled || sample === undefined) 
            return;

        this.fadeInMusic(sample, vol);
    }


    public fadeInMusic(sample : AudioSample | undefined, vol : number = 1.0, fadeTime : number = 0.0) {

        const EPS = 0.001;

        if (this.ctx === undefined ||
            !this.musicEnabled || this.globalVolume <= EPS) 
            return;

        // For some reason 0 fade time does not work
        fadeTime = Math.max(0.1, fadeTime);

        if (this.musicTrack !== undefined) {

            this.musicTrack.stop();
            this.musicTrack = undefined;
        }

        const v = this.globalVolume*vol;
        sample?.fadeIn(this.ctx, fadeTime == null ? v : 0.01, v, true, 0, fadeTime);
        this.musicTrack = sample;
    }


    public pauseMusic() : void {

        if (this.ctx === undefined ||
            !this.musicEnabled || this.musicTrack === undefined)
            return;

        this.musicTrack.pause(this.ctx);
    }


    public resumeMusic() : boolean {

        if (this.ctx === undefined ||
            !this.musicEnabled || this.musicTrack === undefined)
            return false;

        this.musicTrack.resume(this.ctx);
        
        return true;
    }


    public stopMusic() : void {

        //if (!this.musicEnabled || this.musicTrack === undefined)

        this.musicTrack?.stop();
        this.musicTrack = undefined;
    }


    public toggle(state : boolean) : void {

        this.musicEnabled = state;
        this.sfxEnabled = state;
    }


    public toggleSFX(state : boolean = !this.sfxEnabled) : void {

        this.sfxEnabled = state;
    }


    public toggleMusic(state : boolean = !this.musicEnabled) : void {

        this.musicEnabled = state;
    }


    public setGlobalVolume(vol : number) : void {

        this.globalVolume = vol;
    }


    public isSFXEnabled = () : boolean => this.sfxEnabled;
    public isMusicEnabled = () : boolean => this.musicEnabled;


    // public getStateString = () : string => "Audio: " + ["Off", "On"][Number(this.enabled)]; 


    public decodeSample(sampleData : ArrayBuffer, callback : (s : AudioSample) => any) : void {

        if (this.ctx === undefined)
            return;

        this.ctx.decodeAudioData(sampleData, (data : AudioBuffer) => {

            // I know that this.ctx cannot be undefined at this point, but vscode apparently
            // does not, thus the type conversion
            callback(new AudioSample(this.ctx as AudioContext, data));
        });
    }
}
