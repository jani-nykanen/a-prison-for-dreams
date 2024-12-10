import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { InputState } from "../core/inputstate.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { TransitionType } from "../core/transition.js";
import { Bitmap, Canvas, Flip } from "../gfx/interface.js";
import { RGBA } from "../math/rgba.js";


export class Intro implements Scene {


    private phase : number = 0;
    private waitTimer : number = 0;


    public init(param : SceneParameter, event : ProgramEvent) : void {
        
        event.transition.activate(false, TransitionType.Fade, 1.0/30.0, event, undefined, new RGBA(0));
    }


    public update(event : ProgramEvent) : void {

        const WAIT_TIME : number = 60;

        if (event.transition.isActive()) {

            return;
        }

        this.waitTimer += event.tick;
        if (this.waitTimer >= WAIT_TIME || event.input.isAnyPressed()) {


            event.transition.activate(true, TransitionType.Fade, 1.0/30.0, event,
                (event : ProgramEvent) : void => {

                    ++ this.phase;
                    if (this.phase == 2) {

                        event.scenes.changeScene("title", event);
                        event.transition.activate(false, TransitionType.Circle, 1.0/30.0, event);
                        return;
                    }
                    this.waitTimer = 0;
                },
                new RGBA(0));
        }
    }


    public redraw(canvas : Canvas, assets : Assets) : void {
        
        canvas.clear(0, 0, 0);
    
        const bmpCreatedBy : Bitmap | undefined = assets.getBitmap("created_by");
        if (bmpCreatedBy === undefined) {

            return;
        }

        const sw : number = 128 - this.phase*64;
        const sx : number = this.phase*128;

        canvas.drawBitmap(bmpCreatedBy, Flip.None, 
            canvas.width/2 - sw/2, canvas.height/2 - bmpCreatedBy.height/2, 
            sx, 0, sw, bmpCreatedBy.height);
    }


    public dispose() : SceneParameter {
        
        return undefined;
    }
}