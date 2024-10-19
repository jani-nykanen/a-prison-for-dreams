import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas, Bitmap } from "../gfx/interface.js";
import { Vector } from "../math/vector.js";
import { Camera } from "./camera.js";
import { GameObject } from "./gameobject.js";


export class Snowflake extends GameObject {
    

    private radius : number = 0;

    private speedFactor : Vector;
    private angle : number = 0;
    private weight : number = 1.0;


    constructor(x : number, y : number, weight : number = 1.0, radius? : number) {

        super(x, y, true);

        this.radius = radius ?? Math.round(Math.random() + 1);
        this.weight = weight*(1.0 + 0.5*(this.radius - 1));

        const dirMod : number = Math.random() > 0.5 ? 1 : -1;

        // TODO: Add constants in the beginning for speed modifiers
        this.speedFactor = new Vector(
            dirMod*(0.25 + Math.random()*1.0)*this.weight, 
            ((0.25 + Math.random()*1.0)*this.weight));
            
        this.inCamera = true;

        this.friction = new Vector(0.05*this.weight, 0.1*this.weight);
    }


    private drawBase(canvas : Canvas, shiftx : number = 0, shifty : number = 0) : void {

        canvas.fillRect(
            this.pos.x - this.radius/2 + shiftx, 
            this.pos.y - this.radius/2 + shifty, 
            this.radius, this.radius);
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANGLE_CHANGE_SPEED_BASE : number = Math.PI*2/240;
        
        this.angle = (this.angle + ANGLE_CHANGE_SPEED_BASE*this.weight*event.tick) % (Math.PI*2);

        this.target.x = Math.sin(this.angle)*this.speedFactor.x;
        this.target.y = this.speedFactor.y*(0.25 + (Math.sin(this.angle) + 1.0)/2.0*0.75);
    }


    protected cameraEvent(enteredCamera : boolean, camera : Camera, event : ProgramEvent) : void {
        
        const camPos : Vector = camera.getCorner();

        if (this.pos.x < camPos.x) {

            this.pos.x += camera.width;
        }
        else if (this.pos.x >= camPos.x + camera.width) {

            this.pos.x -= camera.width;
        }

        if (this.pos.y < camPos.y) {

            this.pos.y += camera.height;
        }
        else if (this.pos.y >= camPos.y + camera.height) {

            this.pos.y -= camera.height;
        }

        this.inCamera = true;
    }


    public draw(canvas : Canvas): void {
        
        if (!this.exist) {

            return;
        }

        if (this.pos.x <= this.radius) {

            this.drawBase(canvas, canvas.width);
        }
        else if (this.pos.x >= canvas.width - this.radius) {

            this.drawBase(canvas, -canvas.width);
        }
        if (this.pos.y <= this.radius) {

            this.drawBase(canvas, 0, canvas.height);
        }
        else if (this.pos.y >= canvas.height - this.radius) {

            this.drawBase(canvas, 0, -canvas.height);
        }
        this.drawBase(canvas);
    }
}
