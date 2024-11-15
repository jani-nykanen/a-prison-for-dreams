import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { Enemy } from "./enemy.js";


const FOLLOW_SPEED : number = 0.50;
const DROP_GRAVITY : number = 1.0;


export class Bat extends Enemy {


    private initialHealth : number = 0;
    private mode : number = 0;
    private wave : number = 0;


    constructor(x : number, y : number) {

        super(x, y - 2);

        this.sprite.setFrame(7, 5);

        this.health = 7;
        this.initialHealth = this.health;
        this.attackPower = 3;

        this.dropProbability = 0.25;

        this.dir = 0;

        this.target.y = 0.0;

        this.friction.x = 0.025;
        this.friction.y = 0.025;

        this.ignoreBottomLayer = true;

        this.knockbackFactor = 0.75;

        this.coinTypeWeights[0] = 0.90;
        this.coinTypeWeights[1] = 0.10;

        this.bounceFactor.x = 1.5;
        this.bounceFactor.y = 1.5;

        this.collisionBox.w = 8;
        this.collisionBox.h = 8;

        this.hitbox.w = 10;
        this.hitbox.h = 10;
    }


    protected slopeCollisionEvent(direction : -1 | 1, event : ProgramEvent) : void {
        
        if (this.mode == 1) {

            this.mode = 2;
        }
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 6;
        const WAVE_SPEED : number = Math.PI*2/240.0;

        this.flip = Flip.None;

        if (this.mode == 0) {

            this.sprite.setFrame(7, 5);
            return;
        }

        if (this.mode == 1) {

            this.flip = Flip.Vertical;
            this.sprite.setFrame(4, 6);
            if (this.speed.y >= DROP_GRAVITY || this.health < this.initialHealth) {

                this.mode = 2;
            }
            return;
        }

        this.sprite.animate(6, 4, 7, ANIMATION_SPEED, event.tick);
        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
    }


    protected playerEvent(player: Player, event: ProgramEvent): void {
        
        const YOFF_AMPLITUDE : number = 32;
        const DROP_ACTIVATE_DISTANCE : number = 64;

        const ppos : Vector = player.getPosition();
        ppos.y += Math.sin(this.wave)*YOFF_AMPLITUDE;

        if (this.mode == 2) {

            const dir : Vector = Vector.direction(this.pos, ppos);
            const sign : number = player.isAttacking() ? -1 : 1;

            this.flip = ppos.x > this.pos.x ? Flip.Horizontal : Flip.None;

            if (this.hurtTimer > 0) {

                this.target.zeros();
                return;
            }

            this.target.x = sign*dir.x*FOLLOW_SPEED;
            this.target.y = sign*dir.y*FOLLOW_SPEED;

            return;
        }
        
        if (this.mode == 0 && ppos.y > this.pos.y - 8 && 
            Math.abs(this.pos.x - ppos.x) < DROP_ACTIVATE_DISTANCE) {

            this.mode = 1;
            this.target.y = DROP_GRAVITY;
        }
    }
}