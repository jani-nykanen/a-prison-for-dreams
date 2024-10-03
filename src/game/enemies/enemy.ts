import { Assets } from "../../core/assets.js";
import { Canvas, Bitmap, Flip } from "../../gfx/interface.js";
import { CollisionObject } from "../collisionobject.js"
import { Sprite } from "../../gfx/sprite.js";
import { Vector } from "../../math/vector.js";
import { Rectangle } from "../../math/rectangle.js";
import { ProgramEvent } from "../../core/event.js";
import { Player } from "../player.js";


export const BASE_GRAVITY : number = 5.0;


export class Enemy extends CollisionObject {


    protected sprite : Sprite;
    protected flip : Flip = Flip.None;

    protected attackPower : number = 1;
    protected health : number = 5;


    constructor(x : number, y : number) {

        super(x, y, true);
    
        this.sprite = new Sprite(24, 24);

        this.cameraCheckArea = new Vector(32, 32);

        this.collisionBox = new Rectangle(0, -1, 16, 16);
        this.hitbox = new Rectangle(0, 0, 12, 12);

        this.target.y = BASE_GRAVITY;

        this.friction = new Vector(0.10, 0.15);
    }


    protected updateLogic?(event : ProgramEvent) : void;
    protected playerEvent?(player : Player, event : ProgramEvent) : void;


    protected updateEvent(event : ProgramEvent) : void {
            
        this.updateLogic?.(event);
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.exist || !this.inCamera) {

            return;
        }

        const dx : number = this.pos.x - 12;
        const dy : number = this.pos.y - 12;

        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
    }


    public playerCollision(player : Player, event : ProgramEvent) : void {

        if (!this.isActive() || !player.isActive()) {

            return;
        }

        this.playerEvent?.(player, event);

        if (this.overlayObject(player)) {

            player.forceHurt(this.attackPower, Math.sign(player.getPosition().x - this.pos.x), event);
        }
    }
}
