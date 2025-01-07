import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const GRAVITY : number = 4.0;
const MOVE_SPEED : number = 0.6;


export class PogoStick extends Enemy {


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(7, 3);

        this.health = 8;
        this.attackPower =4;

        this.dropProbability = 0.40;
        this.knockbackFactor = 0.75;

        this.friction.x = 0.025;
        this.friction.y = 0.075;

        this.target.y = GRAVITY;

        this.bounceFactor.x = 1.0;

        this.collisionBox.w = 8;
        this.collisionBox.h = 14;
        this.hitbox.w = 8;

        this.coinTypeWeights[0] = 0.80;
        this.coinTypeWeights[1] = 0.20;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const JUMP_HEIGHT : number = -2.5;

        if (this.touchSurface && !this.didTouchSurface) {

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
}