import { ProgramEvent } from "../core/event.js";
import { next } from "./existingobject.js";
import { Splinter } from "./splinter.js";
import { Camera } from "./camera.js";
import { Stage } from "./stage.js";
import { Assets } from "../core/assets.js";
import { Bitmap, Canvas } from "../gfx/interface.js";
import { Breakable } from "./breakable.js";
import { ObjectGenerator } from "./objectgenerator.js";


export class SplinterGenerator extends ObjectGenerator<Splinter, void> {


    constructor() {

        super(Splinter);
    }


    public update(event : ProgramEvent, camera : Camera, stage : Stage) : void {
        
        for (let i : number = 0; i < this.objects.length; ++ i) {

            const o : Splinter = this.objects[i];

            // TODO: Should be redundant
            if (!o.doesExist()) {

                continue;
            }
            
            o.cameraCheck(camera, event);
            o.update(event);
            if (o.isActive()) {

                stage.objectCollision(o, event);
            }

            if (!o.isActive()) {

                this.objects.splice(i, 1);
            }
        }
    }


    public draw(canvas : Canvas, assets : Assets) : void {

        const bmp : Bitmap | undefined = assets.getBitmap("splinter");
        for (const p of this.objects) {

            p.draw(canvas, undefined, bmp);
        }
    }


    public breakableCollision(o : Breakable, event : ProgramEvent) : void {

        for (const p of this.objects) {
            
            o.objectCollision(p, event, false);
        }
    }
}
