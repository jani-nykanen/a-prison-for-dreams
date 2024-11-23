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
    private angle : number = 0;


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

            this.speed.x = this.dir*BASE_SPEED;

            break;

        case PlatformType.VerticallyMoving:

            this.dir = Math.floor(this.pos.y/TILE_HEIGHT) == 0 ? 1 : -1;
            this.friction.y = BASE_FRICTION;

            this.speed.y = this.dir*BASE_SPEED;

            break;

        case PlatformType.Swing:

            this.angle = (Math.floor(this.pos.x/TILE_WIDTH) % 2)*(Math.PI);

            this.computeSwingPosition();
            this.oldPos = this.pos.clone();

            this.cameraCheckArea.x = 256;
            this.cameraCheckArea.y = 256;

            this.sprite.setFrame(0, 1);

            break;

        default:
            break;
        }
    }


    private animatePropeller(event : ProgramEvent) : void {

        const FRAME_LENGTH : number = 4;

        this.sprite.animate(0, 0, 3, FRAME_LENGTH, event.tick);
    }


    private updateVerticallyMovingPlatform(event : ProgramEvent) : void {

        const TRIGGER_DISTANCE : number = 8;

        this.animatePropeller(event);

        if ((this.dir > 0 && this.pos.y - this.initialPos.y > TRIGGER_DISTANCE) ||
            (this.dir < 0 && this.initialPos.y - this.pos.y > TRIGGER_DISTANCE)) {

            this.dir *= -1;
        }
        this.target.y = this.dir*BASE_SPEED;
    }


    private updateHorizontallyMovingPlatform(event : ProgramEvent) : void {

        const TRIGGER_DISTANCE : number = 8;

        this.animatePropeller(event);

        if ((this.dir > 0 && this.pos.x - this.initialPos.x > TRIGGER_DISTANCE) ||
            (this.dir < 0 && this.initialPos.x - this.pos.x > TRIGGER_DISTANCE)) {

            this.dir *= -1;
        }
        this.target.x = this.dir*BASE_SPEED;
    }


    private computeSwingPosition() : void {

        const RADIUS : number = 64;

        this.pos.x = this.initialPos.x + Math.cos(this.angle)*RADIUS;
        this.pos.y = this.initialPos.y + Math.abs(Math.sin(this.angle)*RADIUS) + 4;
    }


    private updateSwing(event : ProgramEvent) : void {

        const SWING_SPEED : number = Math.PI*2/180;
        const SPEED_REDUCTION : number = 0.80;

        const speedFactor : number = 1.0 - Math.abs((this.angle % Math.PI) - Math.PI/2)/(Math.PI/2)*SPEED_REDUCTION;
        
        this.angle = (this.angle + SWING_SPEED*speedFactor*event.tick) % (Math.PI*2);
        this.computeSwingPosition();

        this.speed.zeros();
        this.target.zeros();
    }


    private drawChain(canvas : Canvas, bmp : Bitmap | undefined) : void {

        const CHAIN_COUNT = 7;

        const distance : number = Math.hypot(
            this.pos.x - this.initialPos.x, 
            this.pos.y - this.initialPos.y - 4);
        const distDelta : number = distance/CHAIN_COUNT;

        const c : number = Math.cos(this.angle);
        const s : number = Math.abs(Math.sin(this.angle));

        for (let i : number = 1; i < CHAIN_COUNT + 1; ++ i) {

            const distance : number = distDelta*i;

            const chainx : number = Math.round(this.initialPos.x + c*distance);
            const chainy : number = Math.round(this.initialPos.y + s*distance);

            canvas.drawBitmap(bmp, Flip.None, chainx - 8, chainy - 8, 64, 24, 16, 16);
        }
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        switch (this.type) {

        case PlatformType.HorizontallyMoving:

            this.updateHorizontallyMovingPlatform(event);
            break;

        case PlatformType.VerticallyMoving:

            this.updateVerticallyMovingPlatform(event);
            break;

        case PlatformType.Swing:

            this.updateSwing(event);
            break;

        default:
            break;
        }
    }


    protected postMovementEvent(event: ProgramEvent) : void {

        if (this.type == PlatformType.Swing) {

            this.speed.x = this.pos.x - this.oldPos.x;
            this.speed.y = this.pos.y - this.oldPos.y;
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

        if (this.type == PlatformType.Swing) {

            // Center orb
            canvas.drawBitmap(bmp, Flip.None, this.initialPos.x - 8, this.initialPos.y - 8, 48, 24, 16, 16);
            // Chain
            this.drawChain(canvas, bmp);
        }

        this.sprite.draw(canvas, bmp, this.pos.x - 24, this.pos.y - 12, Flip.None);
    }
}
