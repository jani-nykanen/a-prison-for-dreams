import { RGBA } from "../math/rgba.js";
import { Canvas, Flip } from "../gfx/interface.js";
import { ProgramEvent } from "./event.js";
import { Vector } from "../math/vector.js";


export const enum TransitionType {
    None = 0,
    Fade = 1,
    Circle = 2,
    Waves = 3,
};


export class Transition {


    private timer : number = 1.0;
    private fadeOut : boolean = false;
    private effectType : TransitionType = TransitionType.None;
    private active : boolean = false;
    private speed : number = 1.0;
    private color : RGBA;
    private center : Vector | undefined = undefined;

    private callback : ((event : ProgramEvent) => void) | undefined = undefined;

    private frozen : boolean = false;


    constructor() {

        this.color = new RGBA(0, 0, 0);
    }


    public activate(fadeOut : boolean, type : TransitionType, speed : number, 
        event : ProgramEvent,
        callback : ((event : ProgramEvent) => any) | undefined = undefined, 
        color : RGBA = new RGBA(0, 0, 0),
        center : Vector | undefined = undefined) : void {

        if (type == TransitionType.Waves) {

            this.active = false;
            event.cloneCanvasToBufferTexture(true);
        }

        this.fadeOut = fadeOut;
        this.speed = speed;
        this.timer = 1.0;
        this.callback = callback;
        this.effectType = type;
        this.color = color;
        this.center = center;

        this.active = true;
    }


    public update(event : ProgramEvent) : void {

        if (!this.active || this.frozen) { 

            return;
        }

        this.timer -= this.speed*event.tick;
        if (this.timer <= 0) {

            this.fadeOut = !this.fadeOut;
            if (!this.fadeOut) {

                this.timer += 1.0;
                this.callback?.(event);
                return;
            }

            this.active = false;
            this.timer = 0;

            // For reasons
            // ...this does not work as intended
            // this.color = new RGBA(0, 0, 0);
        }
    }


    public draw(canvas : Canvas) : void {

        const MAX_AMPLITUDE : number = 0.25;
        const MIN_PERIOD : number = 0.25;

        if (!this.active || this.effectType == TransitionType.None) {

            return;
        }

        let t : number = this.timer;
        if (this.fadeOut) {
            
            t = 1.0 - t;
        }

        switch (this.effectType) {

        case TransitionType.Waves: {

            const amplitude : number = t*MAX_AMPLITUDE*canvas.width;
            const period : number = ((1.0 - t) + t*MIN_PERIOD)*canvas.height;
            const shift : number = Math.PI*2*t;

            canvas.clear(this.color.r, this.color.g, this.color.b);
            canvas.drawHorizontallyWavingBitmap(canvas.getCloneBufferBitmap(),
                amplitude, period, shift, 0, 0, Flip.Vertical);
        }
        // Fallthrough
        case TransitionType.Fade:

            canvas.setColor(this.color.r, this.color.g, this.color.b, t);
            canvas.fillRect(0, 0, canvas.width, canvas.height);
            break;

        case TransitionType.Circle: {

                const center : Vector = this.center ?? new Vector(canvas.width/2, canvas.height/2);

                const maxRadius : number = Math.max(
                    Math.hypot(center.x, center.y),
                    Math.hypot(canvas.width - center.x, center.y),
                    Math.hypot(canvas.width - center.x, canvas.height - center.y),
                    Math.hypot(center.x, canvas.height - center.y)
                );

                const radius : number = (1 - t)*(1 - t)*maxRadius;
                canvas.setColor(this.color.r, this.color.g, this.color.b);
                canvas.fillCircleOutside(center.x, center.y, radius);
            }
            break;

        default:
            break;
        }
    }


    public isActive = () : boolean => this.active;
    public isFadingOut = () : boolean => this.active && this.fadeOut;
    public getEffectType = () : TransitionType => this.effectType;

    
    public deactivate() : void {

        this.active = false;
    }


    public setCenter(pos : Vector) : void {

        this.center = pos;
    }


    public changeSpeed(newSpeed : number) : void {

        this.speed = newSpeed;
    }


    public freeze() : void {

        this.frozen = true;
    } 


    public unfreeze() : void {

        this.frozen = false;
    }


    public getColor = () : RGBA => this.color.clone();
}
