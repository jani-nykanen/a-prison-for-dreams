import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 0.25;
const FOLLOW_SPEED : number = 0.50;


export class Apple extends Enemy {


    private initialHealth : number = 0;

    private wave : number = 0;

    private mode : number = 0;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(4, 4);

        this.health = 8;
        this.initialHealth = this.health;
        this.attackPower = 3;

        this.dropProbability = 0.24;

        this.dir = 0;

        this.target.y = 0.0;

        this.wave = Math.random()*(Math.PI*2);

        this.friction.x = 0.025;
        this.friction.y = 0.025;

        this.ignoreBottomLayer = true;

        this.knockbackFactor = 0.75;

        this.coinTypeWeights[0] = 0.90;
        this.coinTypeWeights[1] = 0.10;
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
        const WAVE_SPEED : number = Math.PI*2/90.0;
        const AMPLITUDE : number = 4.0;

        this.sprite.animate(this.sprite.getRow(), this.mode*4, this.mode*4 + 3, ANIMATION_SPEED, event.tick);

        if (this.mode == 0) {

            this.target.x = BASE_SPEED*this.dir;
            // this.speed.x = this.target.x;

            this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
            this.pos.y = this.initialPos.y + Math.sin(this.wave)*AMPLITUDE;

            this.flip = this.target.x > 0 ? Flip.Horizontal : Flip.None;

            if (this.health != this.initialHealth) {

                this.mode = 1;
            }
        }
    }


    protected enemyCollisionEvent(enemy : Enemy, event : ProgramEvent) : void {

        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }


    protected playerEvent(player: Player, event: ProgramEvent): void {
        
        const FOLLOW_DISTANCE : number = 64;

        const ppos : Vector = player.getPosition();
        if (this.mode == 1) {

            const dir : Vector = Vector.direction(this.pos, ppos);

            this.flip = ppos.x > this.pos.x ? Flip.Horizontal : Flip.None;

            if (this.hurtTimer > 0) {

                this.target.zeros();
                return;
            }

            this.target.x = dir.x*FOLLOW_SPEED;
            this.target.y = dir.y*FOLLOW_SPEED;

            return;
        }

        if (Vector.distance(this.pos, ppos) < FOLLOW_DISTANCE) {

            this.mode = 1;
            return;
        }

        if (this.dir == 0) {

            this.dir = Math.sign(player.getPosition().x - this.pos.x)
        }
    }
}