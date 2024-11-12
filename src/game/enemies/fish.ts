import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { TILE_HEIGHT, TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 0.33;


export class Fish extends Enemy {


    private wave : number = 0;


    constructor(x : number, y : number) {

        super(x, y + TILE_HEIGHT/2);

        this.sprite.setFrame(0, 6);

        this.health = 7;
        this.attackPower = 3;

        this.dropProbability = 0.10;

        this.dir = 0;

        this.target.y = 0.0;

        // To avoid everything random that affects the gameplay
        this.wave = (1.0 + Math.sin(x/Math.PI))*Math.PI;

        this.dir = (Math.floor(x/TILE_WIDTH) % 2) == 0 ? 1 : -1;
    }


    protected wallCollisionEvent(direction : number, event : ProgramEvent) : void {
        
        this.dir = -direction;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }


    protected slopeCollisionEvent(direction : number, event : ProgramEvent): void {
        
        const slopeDir : number = Math.sign(this.steepnessFactor);
        if (slopeDir == 0) {

            return;
        }

        this.wallCollisionEvent(-slopeDir, event);
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 6;
        const WAVE_SPEED : number = Math.PI*2/60.0;
        const AMPLITUDE : number = 4.0;

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);

        this.target.x = BASE_SPEED*this.dir;
        // this.speed.x = this.target.x;

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        this.pos.y = this.initialPos.y + Math.sin(this.wave)*AMPLITUDE;

        this.flip = this.dir > 0 ? Flip.Horizontal : Flip.None;
    }


    protected enemyCollisionEvent(enemy : Enemy, event : ProgramEvent) : void {

        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }

}
