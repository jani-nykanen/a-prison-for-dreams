import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 0.50;


export class BoxMan extends Enemy {


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(1, 11);

        this.health = 12;
        this.attackPower = 4;

        this.dropProbability = 0.60;

        this.dir = (Math.floor(x/TILE_WIDTH) % 2) == 0 ? 1 : -1;

        this.collisionBox.w = 8;

        this.knockbackFactor = 1.0;

        this.coinTypeWeights[0] = 0.50;
        this.coinTypeWeights[1] = 0.50;
    }


    protected wallCollisionEvent(direction : -1 | 1, event : ProgramEvent) : void {
        
        this.dir = -direction;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 8;

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);

        if (this.hurtTimer <= 0 && !this.touchSurface && this.didTouchSurface) {

            this.dir *= -1;
            this.pos.x += BASE_SPEED*this.dir;
            this.pos.y = this.oldPos.y;

            this.speed.x = BASE_SPEED*this.dir;
        }

        this.flip = this.dir > 0 ? Flip.Horizontal : Flip.None;

        this.target.x = this.computeSlopeSpeedFactor()*BASE_SPEED*this.dir;
        // this.speed.x = this.target.x;
    }


    protected enemyCollisionEvent(enemy : Enemy, event : ProgramEvent) : void {

        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }
}
