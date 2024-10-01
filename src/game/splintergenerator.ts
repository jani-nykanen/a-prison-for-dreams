import { ProgramEvent } from "../core/event.js";
import { next } from "./existingobject.js";
import { Splinter } from "./splinter.js";
import { Camera } from "./camera.js";
import { Stage } from "./stage.js";
import { Assets } from "../core/assets.js";
import { Bitmap, Canvas } from "../gfx/interface.js";
import { Breakable } from "./breakable.js";


export class SplinterGenerator {


    private splinters : Splinter[];


    constructor() {

        this.splinters = new Array<Splinter> ();
    }


    public spawn(x : number, y : number, speedx : number, speedy : number, 
        row : number, frame : number) : Splinter {

        let splinter : Splinter | undefined = next<Splinter> (this.splinters);
        if (splinter === undefined) {

            splinter = new Splinter();
            this.splinters.push(splinter);
        }

        splinter.spawn(x, y, speedx, speedy, row, frame);
        return splinter!;
    }


    public update(stage : Stage, camera : Camera, event : ProgramEvent) : void {
        
        // TODO: Maybe remove nonexisting splinters to make collision checks faster?

        for (let i : number = 0; i < this.splinters.length; ++ i) {

            const o : Splinter = this.splinters[i];

            /*
            if (!o.doesExist()) {

                continue;
            }
            */

            o.cameraCheck(camera, event);
            o.update(event);
            if (o.isActive()) {

                stage.objectCollision(o, event);
            }

            if (!o.isActive()) {

                this.splinters.splice(i, 1);
            }
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const bmp : Bitmap | undefined = assets.getBitmap("splinter");
        for (const p of this.splinters) {

            p.draw(canvas, undefined, bmp);
        }
    }


    public breakableCollision(o : Breakable, event : ProgramEvent) : void {

        for (const p of this.splinters) {
            
            o.objectCollision(p, event, false, false);
        }
    }
}
