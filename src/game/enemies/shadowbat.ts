import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 0.33;


export class ShadowBat extends Enemy {


    private wave : number = 0;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(4, 1);

        this.health = 3;
        this.attackPower = 1;

        this.dropProbability = 0.10;

        this.dir = 0;

        this.target.y = 0.0;

        this.wave = Math.random()*(Math.PI*2);
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

        this.sprite.animate(this.sprite.getRow(), 4, 7, ANIMATION_SPEED, event.tick);

        this.target.x = this.computeSlopeSpeedFactor()*BASE_SPEED*this.dir;
        // this.speed.x = this.target.x;

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        this.pos.y = this.initialPos.y + Math.sin(this.wave)*AMPLITUDE;
    }


    protected enemyCollisionEvent(enemy : Enemy, event : ProgramEvent) : void {

        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }


    protected playerEvent(player: Player, event: ProgramEvent): void {
        
        if (this.dir == 0) {

            this.dir = Math.sign(player.getPosition().x - this.pos.x)
        }
    }
}