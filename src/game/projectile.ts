import { CollisionObject } from "./collisionobject.js";
import { Sprite } from "../gfx/sprite.js";
import { Vector } from "../math/vector.js";
import { ProgramEvent } from "../core/event.js";
import { Camera } from "./camera.js";
import { Rectangle } from "../math/rectangle.js";
import { Assets } from "../core/assets.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";


const LAST_ANIMATION_FRAME : number[] = [
    3, 3, 3
];

const ANIMATION_SPEED : number[] = [
    4, 4, 4
];


export class Projectile extends CollisionObject {


    private id : number = 0;
    private friendly : boolean = false;

    private sprite : Sprite;


    constructor() {

        super(0, 0, false);

        this.sprite = new Sprite(24, 24);

        // TODO: Different hitboxes for different type of projectiles
        this.hitbox = new Rectangle(0, 0, 4, 4);
        this.collisionBox = new Rectangle(0, 0, 2, 2);

        this.cameraCheckArea = new Vector(24, 24);

        this.checkVerticalSlope = true;
        this.ignoreBottomLayer = true;
        this.ignoreEvenSlopes = true;
    }


    protected die(event : ProgramEvent) : boolean {
        
        const DEATH_SPEED : number = 3;

        const lastFrame : number = LAST_ANIMATION_FRAME[this.id] ?? 0; 

        this.sprite.animate(this.sprite.getRow(), lastFrame + 1, lastFrame + 5, DEATH_SPEED, event.tick);

        return this.sprite.getColumn() == lastFrame + 5;
    }


    protected cameraEvent(enteredCamera : boolean, camera : Camera, event : ProgramEvent) : void {
        
        if (!this.inCamera) {

            this.exist = false;
        }
    }


    protected updateEvent(event : ProgramEvent) : void {

        this.sprite.animate(this.id, 0, 
            LAST_ANIMATION_FRAME[this.id] ?? 0, 
            ANIMATION_SPEED[this.id] ?? 0, event.tick);
    }


    protected wallCollisionEvent(direction: -1 | 1, event : ProgramEvent) : void {
        
        this.kill(event);
    }


    protected slopeCollisionEvent(direction : -1 | 1, event : ProgramEvent): void {

        this.kill(event);
    }


    public spawn(originx : number, originy : number,
        x : number, y : number, 
        speedx : number, speedy : number, 
        id : number, friendly : boolean = true) : void {

        this.oldPos = new Vector(originx, originy);
        this.pos = new Vector(x, y);

        this.speed = new Vector(speedx, speedy);
        this.target = this.speed.clone();

        this.id = id;
        this.friendly = friendly;

        this.sprite.setFrame(0, this.id);

        this.dying = false;
        this.exist = true;
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {

        if (!this.exist) {

            return;
        }

        if (bmp === undefined) {

            canvas.setColor(255, 0, 0);
            canvas.fillRect(this.pos.x - 4, this.pos.y - 4, 8, 8);
            canvas.setColor();
            return;
        }

        this.sprite.draw(canvas, bmp, 
            this.pos.x - this.sprite.width/2, 
            this.pos.y - this.sprite.height/2, 
            Flip.None);
    }


    public kill(event : ProgramEvent) : void {

        this.sprite.setFrame((LAST_ANIMATION_FRAME[this.id] ?? 0) + 1, this.id);
        this.dying = true;

        // TODO: Death sound
    }


    public isFriendly = () : boolean => this.friendly;
}
