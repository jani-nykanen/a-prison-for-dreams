import { ProgramEvent } from "../core/event.js";
import { Bitmap, Canvas, Flip } from "../gfx/interface.js";
import { Camera } from "./camera.js";
import { next } from "./existingobject.js";
import { GameObject } from "./gameobject.js";
import { Particle } from "./particle.js";


export class ParticleGenerator<T extends Particle & GameObject>  {


    private particles : T[];
    private type : Function;


    constructor(type : Function) {

        this.type = type;

        this.particles = new Array<T> ();
    }


    public spawn(x : number, y : number, speedx : number, speedy : number, id : number, flip : Flip = Flip.None) : T {

        let particle : T | undefined = next<T> (this.particles);
        if (particle === undefined) {

            particle = new this.type.prototype.constructor();
            this.particles.push(particle as T);
        }

        particle?.spawn(x, y, speedx, speedy, id, flip);
        return particle!;
    }


    public update(camera : Camera, event : ProgramEvent) : void {

        for (let o of this.particles) {

            if (!o.doesExist()) {

                continue;
            }

            o.cameraCheck(camera, event);
            o.update(event);
        }   
    }


    public draw(canvas : Canvas, bmp : Bitmap | undefined) : void {
    
        for (let o of this.particles) {

            o.draw?.(canvas, undefined, bmp);
        }
    }
}
