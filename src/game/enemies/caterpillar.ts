import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 0.5;
const ANIMATION_SPEED : number[] = [30, 8];


export class Caterpillar extends Enemy {


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(4, 2);

        this.health = 1;
        this.attackPower = 2;

        this.dropProbability = 0.10;

        this.dir = (Math.floor(x/TILE_WIDTH) % 2) == 0 ? 1 : -1;

        this.collisionBox.w = 8;

        this.friction.x = 0.1;
    }


    protected wallCollisionEvent(direction : -1 | 1, event : ProgramEvent) : void {
        
        this.dir = -direction;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        this.sprite.animate(this.sprite.getRow(), 4, 7, 
            ANIMATION_SPEED[this.sprite.getColumn() % 2], event.tick);

        if (!this.touchSurface) {

            this.target.x = 0;
        }
        else {

            const speedMod : number = this.sprite.getColumn() % 2;
            this.target.x = this.computeSlopeSpeedFactor()*BASE_SPEED*this.dir*speedMod;
        }

        this.flip = this.dir > 0 ? Flip.Horizontal : Flip.None;
    }


    protected enemyCollisionEvent(enemy : Enemy, event : ProgramEvent) : void {

        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;

        // this.target.x = BASE_SPEED*this.dir;
        // this.speed.x = this.target.x;
    }
}