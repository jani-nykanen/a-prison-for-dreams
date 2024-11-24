import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 0.80;


export class Hog extends Enemy {


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(0, 8);

        this.health = 8;
        this.attackPower = 3;

        this.dropProbability = 0.40;
        this.coinTypeWeights[0] = 0.80;
        this.coinTypeWeights[1] = 0.20;

        this.collisionBox.w = 12;

        this.knockbackFactor = 0.75;

        this.friction.x = 0.05;
    }


    private jump(event : ProgramEvent) : void {

        const JUMP_HEIGHT : number = -3.0;

        this.speed.y = JUMP_HEIGHT;
        event.audio.playSample(event.assets.getSample("jump2"), 0.30);
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 4;
        const JUMP_FRAME_EPS : number = 0.5;

        if (this.touchSurface) {

            this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
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

        if (!this.touchSurface) {

            return;
        }

        const ppos : Vector = player.getPosition();

        this.dir = Math.sign(ppos.x - this.pos.x);

        if (ppos.y < this.pos.y - JUMP_TRIGGER) {

            this.jump(event);
        }
    }
}