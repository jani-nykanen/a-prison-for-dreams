import { CollisionObject } from "./collisionobject.js";
import { Sprite } from "../gfx/sprite.js";
import { Vector } from "../math/vector.js";
import { ProgramEvent } from "../core/event.js";
import { Camera } from "./camera.js";
import { Rectangle } from "../math/rectangle.js";
import { Assets } from "../core/assets.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { Progress } from "./progress.js";
import { GameObject } from "./gameobject.js";


const LAST_ANIMATION_FRAME : number[] = [
    3, 2, 3, 2, 3
];

const ANIMATION_SPEED : number[] = [
    4, 4, 4, 4, 4
];


const HITBOX_WIDTHS : number[] = [
    4, 8, 4, 4, 8,
];
const HITBOX_HEIGHTS : number[] = [
    4, 8, 4, 4, 8
]


const DEATH_SAMPLE_VOLUME : number = 0.50;


export class Projectile extends CollisionObject {


    private id : number = 0;
    private attackID : number = -1;
    private power : number = 0;
    private friendly : boolean = false;

    private sprite : Sprite;

    private targetObject : GameObject | undefined = undefined;
    private followSpeed : number = 0;

    public readonly stats : Progress | undefined = undefined;


    constructor(progress : Progress | undefined) {

        super(0, 0, false);

        this.sprite = new Sprite(24, 24);

        this.hitbox = new Rectangle(0, 0, 4, 4);
        this.collisionBox = new Rectangle(0, 0, 2, 2);

        this.cameraCheckArea = new Vector(24, 24);

        this.checkVerticalSlope = true;
        this.ignoreBottomLayer = true;
        // Probably not even need any more
        // this.ignoreEvenSlopes = true;

        this.stats = progress;

        this.computeFriction();
    }


    private computeFriction() : void {

        if (this.id == 4) {

            this.friction.x = 0.0125;
            this.friction.y = 0.0125;
            return;
        }

        this.friction.x = 0.125;
        this.friction.y = 0.125;
    }


    protected die(event : ProgramEvent) : boolean {
        
        const DEATH_SPEED : number = 3;

        const lastFrame : number = Math.max(3, LAST_ANIMATION_FRAME[this.id] ?? 0); 

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

        if (this.targetObject !== undefined) {

            const dir : Vector = Vector.direction(this.pos, this.targetObject.getPosition());

            this.target.x = this.followSpeed*dir.x;
            this.target.y = this.followSpeed*dir.y;
        }

        this.computeFriction();
    }


    protected wallCollisionEvent(direction: -1 | 1, event : ProgramEvent) : void {
        
        this.kill(event);
        event.audio.playSample(event.assets.getSample("bullethit"), DEATH_SAMPLE_VOLUME);
    }


    protected slopeCollisionEvent(direction : -1 | 1, event : ProgramEvent): void {

        this.kill(event);
        event.audio.playSample(event.assets.getSample("bullethit"), DEATH_SAMPLE_VOLUME);
    }


    public spawn(originx : number, originy : number,
        x : number, y : number, 
        speedx : number, speedy : number, 
        id : number, power : number,
        friendly : boolean = true,
        attackID : number = -1,
        targetObject : GameObject | undefined = undefined,
        followSpeed : number = 0.0, getGravity : boolean = false) : void {

        const IGNORE_EVEN_THRESHOLD : number = 0.001;
        const BASE_GRAVITY : number = 4.0;

        this.oldPos = new Vector(originx, originy);
        this.pos = new Vector(x, y);

        this.speed = new Vector(speedx, speedy);
        this.target = this.speed.clone();

        this.id = id;
        this.friendly = friendly;
        this.attackID = attackID;
        this.power = power;

        this.sprite.setFrame(0, this.id);

        this.hitbox.w = HITBOX_WIDTHS[this.id] ?? 4;
        this.hitbox.h = HITBOX_HEIGHTS[this.id] ?? 4;

        this.dying = false;
        this.exist = true;

        this.ignoreEvenSlopes = Math.abs(this.speed.y) < IGNORE_EVEN_THRESHOLD;

        this.targetObject = targetObject;
        this.followSpeed = followSpeed;

        if (getGravity) {

            this.target.y = BASE_GRAVITY;
        }
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {

        if (!this.inCamera || !this.exist) {

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
    }


    public getPower() : number {

        return this.power;
    }


    public isFriendly = () : boolean => this.friendly;
    public getID = () : number => this.id;
    public destroyOnTouch = () : boolean => this.id != 1;
    public getAttackID = () : number => this.attackID;
}
