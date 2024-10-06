import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { Enemy } from "./enemy.js";


export class Slime extends Enemy {


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(0, 1);

        this.health = 6;
        this.attackPower = 2;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 8;

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }

    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        this.flip = player.getPosition().x > this.pos.x ? Flip.Horizontal : Flip.None;
    }
}