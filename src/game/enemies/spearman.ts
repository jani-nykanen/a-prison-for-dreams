import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const GRAVITY : number = 4.0;
const MOVE_SPEED : number = 0.6;


export class Spearman extends Enemy {


    constructor(x : number, y : number) {

        super(x, y - 36);

        this.sprite.setFrame(6, 14);

        this.health = 8;
        this.attackPower = 4;

        this.dropProbability = 0.80;
        this.knockbackFactor = 0.75;

        this.friction.x = 0.025;
        this.friction.y = 0.075;

        this.target.y = GRAVITY;

        this.bounceFactor.x = 1.0;

        this.collisionBox.y = 13;
        this.collisionBox.w = 8;
        this.collisionBox.h = 42;

        this.hitbox.y = 0;
        this.hitbox.h = -12;
        this.hitbox.w = 10;
        this.hitbox.h = 16;

        this.overriddenHurtbox = new Rectangle(0, 13, 4, 36);

        this.coinTypeWeights[0] = 0.10;
        this.coinTypeWeights[1] = 0.90;

        this.cameraCheckArea.y = 80;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const JUMP_HEIGHT : number = -2.75;

        if (this.touchSurface) {

            this.speed.y = JUMP_HEIGHT;
            event.audio.playSample(event.assets.getSample("jump2"), 0.30);
        }

        this.flip = this.dir > 0 ? Flip.Horizontal : Flip.None;

        this.target.x = this.dir*MOVE_SPEED;
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        const ppos : Vector = player.getPosition();
        this.dir = Math.sign(ppos.x - this.pos.x);
    }


    protected wallCollisionEvent(direction : -1 | 1, event : ProgramEvent): void {

        this.dir = -direction;

        this.target.x = MOVE_SPEED*this.dir;
        this.flip = direction > 0 ? Flip.None : Flip.Horizontal;
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.exist || !this.inCamera) {

            return;
        }

        // Flicker if hurt
        if (!this.dying && this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer/4) % 2 != 0) {

            return;
        }

        const dx : number = this.pos.x - this.sprite.width/2;
        const dy : number = this.pos.y - this.sprite.height/2;

        // Main body
        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
        
        // Pogo stick
        if (!this.dying) {
            
            canvas.drawBitmap(bmp, this.flip, dx, dy + 24, 168, 336, 24, 24);
        }
    }
}