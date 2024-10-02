import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Bitmap, Canvas, Flip } from "../gfx/interface.js";
import { AnimatedParticle } from "./animatedparticle.js";
import { Camera } from "./camera.js";
import { next } from "./existingobject.js";
import { GameObject } from "./gameobject.js";
import { ObjectGenerator } from "./objectgenerator.js";


export class ParticleGenerator extends ObjectGenerator<AnimatedParticle>  {


    constructor() {

        super(AnimatedParticle);
    }


    public update(camera : Camera, event : ProgramEvent) : void {

        for (let o of this.objects) {

            if (!o.doesExist()) {

                continue;
            }

            o.cameraCheck(camera, event);
            o.update(event);
        }   
    }


    public draw(canvas : Canvas, assets : Assets) : void {
        
        const bmpParticles1 : Bitmap | undefined = assets.getBitmap("particles_1");
        for (let o of this.objects) {

            o.draw(canvas, undefined, bmpParticles1);
        }
    }
}
