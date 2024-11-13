import { ProgramEvent } from "../core/event.js";
import { GameObject } from "./gameobject.js";
import { CollisionObject } from "./collisionobject.js";
import { Sprite } from "../gfx/sprite.js";
import { Assets } from "../core/assets.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Vector } from "../math/vector.js";


const BASE_FRICTION : number = 0.015;
const BASE_SPEED : number = 1.0;


export const enum PlatformType {

    VerticallyMoving = 0,
    HorizontallyMoving = 1,
    Bouncing = 2,
    Swing = 3
};


export class Platform extends GameObject {


    private initialPos : Vector;

    private type : PlatformType;
    private sprite : Sprite;

    private dir : number = 0;


    constructor(x : number, y : number, type : PlatformType) {

        super(x, y, true);

        this.initialPos = this.pos.clone();

        this.type = type;

        this.cameraCheckArea.x = 128;
        this.cameraCheckArea.y = 128;

        this.sprite = new Sprite(48, 24);

        switch (this.type) {

        case PlatformType.HorizontallyMoving:

            this.dir = Math.floor(this.pos.x/TILE_WIDTH) == 0 ? 1 : -1;
            this.friction.x = BASE_FRICTION;
            break;

        case PlatformType.VerticallyMoving:

            this.dir = Math.floor(this.pos.y/TILE_HEIGHT) == 0 ? 1 : -1;
            this.friction.y = BASE_FRICTION;
            break;

        default:
            break;
        }
    }


    private updateVerticallyMovingPlatform(event : ProgramEvent) : void {

        const TRIGGER_DISTANCE : number = 8;

        if ((this.dir > 0 && this.pos.y - this.initialPos.y > TRIGGER_DISTANCE) ||
            (this.dir < 0 && this.initialPos.y - this.pos.y > TRIGGER_DISTANCE)) {

            this.dir *= -1;
        }
        this.target.y = this.dir*BASE_SPEED;
    }


    private updateHorizontallyMovingPlatform(event : ProgramEvent) : void {

        const TRIGGER_DISTANCE : number = 8;

        if ((this.dir > 0 && this.pos.x - this.initialPos.x > TRIGGER_DISTANCE) ||
            (this.dir < 0 && this.initialPos.x - this.pos.x > TRIGGER_DISTANCE)) {

            this.dir *= -1;
        }
        this.target.x = this.dir*BASE_SPEED;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const FRAME_LENGTH : number = 4;

        this.sprite.animate(0, 0, 3, FRAME_LENGTH, event.tick);

        switch (this.type) {

        case PlatformType.HorizontallyMoving:

            this.updateHorizontallyMovingPlatform(event);
            break;

        case PlatformType.VerticallyMoving:

            this.updateVerticallyMovingPlatform(event);
            break;

        default:
            break;
        }
    }


    public objectCollision(o : CollisionObject, event : ProgramEvent) : void {

        if (!this.isActive() || !o.isActive() ||
            (this.type != PlatformType.Bouncing && o.doesIgnoreBottomLayer())) {

            return;
        }

        o.slopeCollision(
            this.pos.x - 24, this.pos.y - 12, 
            this.pos.x + 24, this.pos.y - 12, 1, event, 1, 1,
            1, 4, this);
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.isActive()) {

            return;
        }

        this.sprite.draw(canvas, bmp, this.pos.x - 24, this.pos.y - 12, Flip.None);
    }
}
