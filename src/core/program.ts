import { Canvas, Renderer, TransformTarget } from "../gfx/interface.js";
import { ProgramEvent } from "./event.js";
import { InputState } from "./inputstate.js";


export class Program {


    private renderer : Renderer;
    private event : ProgramEvent;

    private timeSum : number = 0.0;
    private oldTime : number = 0.0;

    private initialized : boolean = false;

    private onloadEvent : ((event : ProgramEvent) => void) | undefined = undefined;

    private animationRequest : number | undefined = undefined;


    constructor(ctx : AudioContext, type : Function, 
        canvasWidth? : number, canvasHeight? : number,
        preserveSquarePixels : boolean = true, dynamicCanvas : boolean = false, 
        linearFilter : boolean = false,
        maxCanvasWidth : number | undefined = undefined, 
        maxCanvasHeight : number | undefined = undefined) {

        this.renderer = (new type.prototype.constructor (
            canvasWidth, canvasHeight, 
            preserveSquarePixels, dynamicCanvas, linearFilter,
            maxCanvasWidth, maxCanvasHeight)) as Renderer;
        this.event = new ProgramEvent(ctx, this.renderer);
    }


    private setDefaultTransform(canvas : Canvas) : void {

        canvas.setColor();
        canvas.transform.setTarget(TransformTarget.Camera);
        canvas.transform.view(canvas.width, canvas.height);

        canvas.transform.setTarget(TransformTarget.Model);
        canvas.transform.loadIdentity();
        canvas.applyTransform();
    }


    private drawLoadingScreen(canvas : Canvas) : void {

        const OUTLINE : number = 1;
        const WIDTH : number  = 80;
        const HEIGHT : number  = 12;

        const p : number = this.event.assets.getLoadingPercentage();

        const dx : number = canvas.width/2 - WIDTH/2;
        const dy : number = canvas.height/2 - HEIGHT/2;

        canvas.clear(0, 0, 0);
        canvas.setColor();
        canvas.fillRect(dx, dy, WIDTH, HEIGHT);
        canvas.setColor(0, 0, 0);
        canvas.fillRect(dx + OUTLINE, dy + OUTLINE, WIDTH - OUTLINE*2, HEIGHT - OUTLINE*2);
        canvas.setColor();
        canvas.fillRect(dx + OUTLINE*2, dy + OUTLINE*2, (WIDTH - OUTLINE*4)*p, HEIGHT - OUTLINE*4);
    }


    private checkDefaultKeyShortcuts() : void {

        // nw.js only
        if ((this.event.input.keyboard.getKeyState("AltLeft") & InputState.DownOrPressed) != 0 &&
             this.event.input.keyboard.getKeyState("Enter") == InputState.Pressed) {

            window["nw"]?.["Window"]?.["get"]?.()?.["toggleFullscreen"]?.();
        }
    }


    private loop(ts : number, errorEvent? : (e : Error) => void) : void {

        const MAX_REFRESH_COUNT : number = 5; // Needed in the case that window gets deactivated and reactivated much later
        const FRAME_TIME : number = 16.66667;

        const delta : number = ts - this.oldTime;
        const loaded : boolean = this.event.assets.hasLoaded();

        this.timeSum = Math.min(this.timeSum + delta, MAX_REFRESH_COUNT * FRAME_TIME);
        this.oldTime = ts;

        this.event.input.gamepad.refreshGamepads();

        try {

            if (loaded && !this.initialized) {

                this.onloadEvent?.(this.event);
                this.event.scenes.init(this.event);

                this.initialized = true;
            }

            let firstFrame : boolean = true;
            for (; this.timeSum >= FRAME_TIME; this.timeSum -= FRAME_TIME) {

                this.event.input.preUpdate();

                if (loaded) {

                    this.event.scenes.update(this.event);
                    this.event.transition.update(this.event);
                }
                
                if (firstFrame) {

                    if (window["nw"] !== undefined) {

                        this.checkDefaultKeyShortcuts();
                    }

                    this.event.input.update(this.event);
                    firstFrame = false;
                }
            }
            
            this.renderer.drawToCanvas((canvas : Canvas) : void => {

                this.setDefaultTransform(canvas);
                canvas.flushSpriteBatch();

                if (loaded) {
                    
                    this.event.scenes.redraw(canvas, this.event.assets);
                    this.event.transition.draw(canvas);
                    this.event.scenes.postDraw(canvas, this.event.assets);
                }
                else {

                    this.drawLoadingScreen(canvas);
                }

                this.setDefaultTransform(canvas);
                this.event.drawCursor(canvas);
            });
            this.renderer.refresh();
        }
        catch(e : any) {

            if (this.animationRequest !== undefined) {

                window.cancelAnimationFrame(this.animationRequest);
            }
            errorEvent?.(e);

            return;
        }

        this.animationRequest = window.requestAnimationFrame(ts => this.loop(ts, errorEvent));
    }


    public run(initialEvent? : (event : ProgramEvent) => void,
        onload? : (event : ProgramEvent) => void,
        errorEvent? : (e : Error) => void) : void{

        initialEvent?.(this.event);
        this.onloadEvent = onload;

        this.loop(0.0, errorEvent);
    }
}
