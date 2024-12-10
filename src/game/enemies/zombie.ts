import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 0.25;


export class Zombie extends Enemy {


    private initialHealth : number = 0;


    private risenUp : boolean = false;
    private rising : boolean = false;


    constructor(x : number, y : number) {

        super(x, y + 1);

        this.sprite.setFrame(4, 3);

        this.health = 6;
        this.initialHealth = this.health;
        this.attackPower = 2;

        this.dropProbability = 0.15;

        this.friction.x = 0.05;

        this.dir = -1;
    }


    protected wallCollisionEvent(direction : -1 | 1, event : ProgramEvent) : void {
        
        this.dir = -direction;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 8;
        const RISE_SPEED : number = 8;

        this.knockbackFactor = this.risenUp ? 1.0 : 0.0;

        if (!this.risenUp) {

            if (this.health != this.initialHealth) {

                this.rising = true;
            }

            if (this.rising) {

                this.sprite.animate(this.sprite.getRow(), 4, 7, RISE_SPEED, event.tick);
                if (this.sprite.getColumn() == 7) {

                    this.sprite.setFrame(0, this.sprite.getRow());
                    this.rising = false;
                    this.risenUp = true;

                    this.target.x = BASE_SPEED*this.dir;
                    this.speed.x = this.target.x;
                }
            }
            return;
        }

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);

        this.flip = this.dir > 0 ? Flip.Horizontal : Flip.None;

        this.target.x = this.computeSlopeSpeedFactor()*BASE_SPEED*this.dir;
        // this.speed.x = this.target.x;
    }


    protected enemyCollisionEvent(enemy : Enemy, event : ProgramEvent) : void {

        this.dir = enemy.getPosition().x > this.pos.x ? -1 : 1;

        this.target.x = BASE_SPEED*this.dir;
        this.speed.x = this.target.x;
    }


    protected playerEvent(player: Player, event: ProgramEvent): void {
        
        const ACTIVATION_DISTANCE : number = 96;

        if (this.risenUp || this.rising) {

            return;
        }

        const xpos : number = player.getPosition().x;
        const onRight : boolean = xpos > this.pos.x;

        this.flip = onRight ? Flip.Horizontal : Flip.None;
        this.dir = onRight ? 1 : -1;

        if (Math.abs(this.pos.x - xpos) < ACTIVATION_DISTANCE) {

            this.rising = true;
        }
    }
}
