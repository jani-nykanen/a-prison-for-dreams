import { GameObject } from "./gameobject.js";
import { Vector } from "../math/vector.js";
import { ProgramEvent } from "../core/event.js";
import { Sprite } from "../gfx/sprite.js";
import { Assets } from "../core/assets.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { Camera } from "./camera.js";


const ANIMATION_LENGTH : number[] = [
    4, 4,
];


const ANIMATION_SPEED : number[] = [
    8, 8
];


export class AnimatedParticle extends GameObject {


    private sprite : Sprite;
    private flip : Flip = Flip.None;
    private id : number = 0;
    

    constructor() {

        super(0, 0, false);

        this.sprite = new Sprite(16, 16);

        this.cameraCheckArea = new Vector(32, 32);
    }


    protected cameraEvent(enteredCamera : boolean, camera : Camera, event : ProgramEvent) : void {
        
        if (!this.inCamera) {

            this.exist = false;
        }
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        this.sprite.animate(this.sprite.getRow(), 
            0, ANIMATION_LENGTH[this.id],
            ANIMATION_SPEED[this.id], event.tick);
        if (this.sprite.getColumn() == 4) {

            this.exist = false;
        }
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.exist || !this.inCamera) {

            return;
        }

        this.sprite.draw(canvas, bmp,
            this.pos.x - this.sprite.width/2, this.pos.y - this.sprite.height/2,
            this.flip);
    }


    public spawn(x : number, y : number, speedx : number, speedy : number, id : number, flip : Flip = Flip.None) : void {

        this.pos = new Vector(x, y);
        this.speed = new Vector(speedx, speedy);
        this.target = this.speed.clone();

        this.id = id;
        this.flip = flip;

        this.dying = false;
        this.exist = true;

        this.sprite.setFrame(0, this.id);
    }
}
