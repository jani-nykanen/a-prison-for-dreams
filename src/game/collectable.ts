import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
import { CollisionObject } from "./collisionobject.js";
import { Sprite } from "../gfx/sprite.js";
import { Player } from "./player.js";


const EXISTENCE_TIME : number = 300;
const BASE_GRAVITY : number = 3.0;


export const enum CollectableType {

    Unknown = 0,
    SilverCoin = 1,
}


export class Collectable extends CollisionObject {


    private type : CollectableType = CollectableType.Unknown;
    private sprite : Sprite;

    private timer : number = 0;


    constructor() {

        super(0, 0, false);

        this.collisionBox = new Rectangle(0, 1, 8, 8);
        this.hitbox = new Rectangle(0, 0, 10, 10);

        this.target.x = 0;
        this.target.y = BASE_GRAVITY;

        this.friction.x = 0.025;
        this.friction.y = 0.075;

        this.cameraCheckArea = new Vector(16, 16);

        this.bounceFactor.x = 1.0;
        this.bounceFactor.y = 0.80;

        this.sprite = new Sprite(16, 16);
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 6;

        this.timer -= event.tick;
        if (this.timer <= 0) {

            this.exist = false;
        }

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }


    public spawn(x : number, y : number, speedx : number, speedy : number, type : CollectableType) : void {

        this.pos = new Vector(x, y);
        this.oldPos = this.pos.clone();

        this.speed = new Vector(speedx, speedy);
        // this.target = this.speed.clone();

        this.type = type;

        this.sprite.setFrame(Math.floor(Math.random()*4), Math.min(0, type - 1));

        this.timer = EXISTENCE_TIME;

        this.dying = false;
        this.exist = true;
    }


    public draw(canvas: Canvas, assets: Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.inCamera || !this.exist) {

            return;
        }

        const dx : number = this.pos.x - 8;
        const dy : number = this.pos.y - 8;

        this.sprite.draw(canvas, bmp, dx, dy, Flip.None);
    }


    public playerCollision(player : Player, event : ProgramEvent) : void {

        if (!player.isActive() || !this.isActive()) {

            return;
        }

        if (player.overlayObject(this)) {

            this.exist = false;
        }
    }
}
