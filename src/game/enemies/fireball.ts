import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { Enemy } from "./enemy.js";


const INITIAL_WAIT_TIME : number = 30;
const BASE_WAIT_TIME : number = 90;

const GRAVITY : number = 3.0;


export class Fireball extends Enemy {


    private timer : number = INITIAL_WAIT_TIME;
    private active : boolean = false;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(0, 12);

        this.health = 1;
        this.attackPower = 5;

        this.dropProbability = 0.0;

        this.takeCollisions = false;
        this.canBeHurt = false;
        this.canBeMoved = false;
        
        this.hitbox.w = 10;
        this.hitbox.h = 10;
        this.hitbox.y = 0;

        this.target.y = 0.0;
        this.friction.y = 0.10;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 6;
        const JUMP_SPEED : number = -5.0;

        if (!this.active) {

            this.timer -= event.tick;
            if (this.timer <= 0) {

                this.active = true;
                this.speed.y = JUMP_SPEED;
                this.target.y = GRAVITY;

                this.flip = Flip.Vertical;

                // TODO: Proper fireball sound?
                event.audio.playSample(event.assets.getSample("throw"), 0.50);
            }

            this.bodyOpacity = 0.0;
            return;
        }

        if (this.speed.y > 0.0) {

            this.flip = Flip.None; 
        }

        this.bodyOpacity = 1.0;
        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);

        if (this.speed.y > 0 && this.pos.y > this.initialPos.y) {

            this.active = false;
            this.pos.y = this.initialPos.y;
            this.timer = BASE_WAIT_TIME;

            this.target.y = 0;
            this.speed.y = 0;
        }
    }
}