import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const THROW_TIME : number = 120;


export class Doppelganger extends Enemy {


    private throwTimer : number = 0;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(0, 5);

        this.health = 5;
        this.attackPower = 1;

        this.dropProbability = 0.25;

        this.collisionBox.w = 10;

        this.throwTimer = Math.floor(x/TILE_WIDTH) % 2 == 0 ? THROW_TIME/2 : THROW_TIME;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const BASE_THROW_ANIMATION_SPEED : number = 4;
        const FINAL_FRAME_DURATION : number = 20;

        const THROW_SPEED : number = 2.5;

        if (this.sprite.getColumn() != 0) {

            this.sprite.animate(this.sprite.getRow(), 2, 4, 
                this.sprite.getColumn() != 3 ? BASE_THROW_ANIMATION_SPEED : FINAL_FRAME_DURATION, 
                event.tick);
            if (this.sprite.getColumn() == 4) {

                this.sprite.setFrame(0, 5);
            }
        }
        else {

            this.throwTimer -= event.tick;
            if (this.throwTimer <= 0) {

                this.throwTimer += THROW_TIME;

                this.projectiles?.next().spawn(
                    this.pos.x, this.pos.y, 
                    this.pos.x + this.dir*8, this.pos.y, 
                    THROW_SPEED*this.dir, 0.0, 2, 3, false);

                this.sprite.setFrame(1, 5);
            }
        }
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        this.dir = player.getPosition().x > this.pos.x ? 1 : -1;
        this.flip = this.dir > 1 ? Flip.Horizontal : Flip.None;
    }
}