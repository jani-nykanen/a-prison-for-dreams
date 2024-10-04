import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Bitmap, Canvas } from "../gfx/interface.js";
import { Camera } from "./camera.js";
import { ExistingObject, next } from "./existingobject.js";
import { GameObject } from "./gameobject.js";
import { Stage } from "./stage.js";


export class ObjectGenerator<T extends GameObject> {


    protected objects : T[];
    protected baseType : Function;


    constructor(baseType : Function) {

        this.baseType = baseType;
        this.objects = new Array<T> ();
    }


    public next() : T {

        let o : T | undefined = next<T> (this.objects);
        if (o === undefined) {

            o = new this.baseType.prototype.constructor() as T;
            this.objects.push(o); 
        }
        return o;
    }


    public update(event : ProgramEvent, camera : Camera, stage? : Stage) : void {

        for (let o of this.objects) {

            if (!o.doesExist()) {

                continue;
            }

            o.cameraCheck(camera, event);
            o.update(event);
        }   
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        for (let o of this.objects) {

            o.draw(canvas, assets, bmp);
        }
    }
} 