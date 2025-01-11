import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 1.25;
const JUMP_RECOVER_TIME : number = 30;


export class DemonPig extends Enemy {

    
    private jumpRecoverTimer : number = JUMP_RECOVER_TIME;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(0, 16);

        this.health = 14;
        this.attackPower = 4;

        this.dropProbability = 1.0;
        this.coinTypeWeights[0] = 0.0;
        this.coinTypeWeights[1] = 1.0;

        this.hitbox.w = 18;
        this.collisionBox.w = 14;

        this.overriddenHurtbox = new Rectangle(0, 1, 14, 12);

        this.knockbackFactor = 0.85;

        this.friction.x = 0.05;
        this.friction.y = 0.10;

        this.target.y = 3.0;
    }


    private jump(event : ProgramEvent) : void {

        const JUMP_HEIGHT : number = -2.75;

        this.speed.y = JUMP_HEIGHT;
        event.audio.playSample(event.assets.getSample("jump2"), 0.30);
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 4;
        const JUMP_FRAME_EPS : number = 0.5;

        if (this.touchSurface) {

            this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
            if (this.jumpRecoverTimer > 0) {

                this.jumpRecoverTimer -= event.tick;
            }
        }
        else {

            let frame : number = 5;
            if (this.speed.y < -JUMP_FRAME_EPS) {

                frame = 4;
            }
            else if (this.speed.y > JUMP_FRAME_EPS) {

                frame = 6;
            }

            this.sprite.setFrame(frame, this.sprite.getRow());
        }

        if (this.hurtTimer <= 0 && !this.touchSurface && this.didTouchSurface) {

            this.jump(event);
        }

        this.flip = this.dir > 0 ? Flip.Horizontal : Flip.None;

        this.target.x = this.computeSlopeSpeedFactor()*BASE_SPEED*this.dir;
        // this.speed.x = this.target.x;
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        const JUMP_TRIGGER : number = 48;
        const JUMP_SPEED_THRESHOLD : number = 0.75;

        const ppos : Vector = player.getPosition();

        this.dir = Math.sign(ppos.x - this.pos.x);

        if (((this.touchSurface && this.jumpRecoverTimer <= 0) || this.speed.y > JUMP_SPEED_THRESHOLD) &&
            (ppos.y < this.pos.y - JUMP_TRIGGER ||
            (this.hurtTimer <= 0 && this.touchSurface && player.isAttacking()))) {

            this.jump(event);
            this.jumpRecoverTimer = JUMP_RECOVER_TIME;
        }
    }


    protected wallCollisionEvent(direction : -1 | 1, event : ProgramEvent) : void {
        
        this.jump(event);
    }
}