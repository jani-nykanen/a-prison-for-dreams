import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { InputState } from "../core/inputstate.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { TransitionType } from "../core/transition.js";
import { Bitmap, Canvas, Flip } from "../gfx/interface.js";
import { RGBA } from "../math/rgba.js";
import { Background, BackgroundType } from "./background.js";
import { Camera } from "./camera.js";


const TRANSITION_TIME : number = 20;


export class Intro implements Scene {


    private background : Background;
    private dummyCamera : Camera;

    private phase : number = 0;
    private transitionTimer : number = 0;
    private transitionPhase : number = 0;
    private waitTimer : number = 0;


    constructor(event : ProgramEvent) {

        this.background = new Background(event.screenHeight, BackgroundType.Graveyard);
        this.dummyCamera = new Camera(0, -256, event);
    }


    public init(param : SceneParameter, event : ProgramEvent) : void {
        
        event.transition.activate(false, TransitionType.Fade, 1.0/20.0, event, undefined, new RGBA(0));
    }


    public update(event : ProgramEvent) : void {

        const WAIT_TIME : number = 60;

        this.background.update(this.dummyCamera, event);

        if (event.transition.isActive()) {

            return;
        }

        if (this.transitionTimer > 0) {

            this.transitionTimer -= event.tick;
            if (this.transitionTimer <= 0) {

                if (this.transitionPhase == 0) {

                    this.waitTimer = 0;
                }
                else if (this.transitionPhase == 1) {

                    ++ this.phase;
                    if (this.phase == 2) {

                        event.scenes.changeScene("title", event);
                        return;
                    }

                    this.transitionPhase = 0;
                    this.transitionTimer = TRANSITION_TIME;
                }
            }
            return;
        }

        this.waitTimer += event.tick;
        if (this.waitTimer >= WAIT_TIME || event.input.isAnyPressed()) {

            this.transitionPhase = 1;
            this.transitionTimer = TRANSITION_TIME;
        }
    }


    public redraw(canvas : Canvas, assets : Assets) : void {
        
        const SHADOW_OFFSET : number = 2;
        const SHADOW_ALPHA : number = 0.33;
        const BACKGROUND_MASK_ALPHA : number = 0.25;

        this.background.draw(canvas, assets, this.dummyCamera);

        canvas.setColor(0, 0, 0, BACKGROUND_MASK_ALPHA);
        canvas.fillRect();
        canvas.setColor();
    
        const bmpCreatedBy : Bitmap | undefined = assets.getBitmap("created_by");
        if (bmpCreatedBy === undefined) {

            return;
        }

        const sw : number = 128 - this.phase*64;
        const sx : number = this.phase*128;

        let alpha : number = 1.0;
        if (this.transitionTimer > 0) {

            let t : number = this.transitionTimer/TRANSITION_TIME;
            if (this.transitionPhase == 0) {

                t = 1.0 - t;
            }
            alpha = t;
        }

        for (let i : number = 1; i >= 0; -- i) {

            if (i == 1) {

                canvas.setColor(0, 0, 0, SHADOW_ALPHA*alpha);
            }
            else {

                canvas.setColor(255, 255, 255, alpha);
            }

            canvas.drawBitmap(bmpCreatedBy, Flip.None, 
                canvas.width/2 - sw/2 + SHADOW_OFFSET*i, 
                canvas.height/2 - bmpCreatedBy.height/2 + SHADOW_OFFSET*i, 
                sx, 0, sw, bmpCreatedBy.height);
        }

        canvas.setColor();
    }


    public dispose() : SceneParameter {
        
        return this.background.getCloudPosition();
    }
}