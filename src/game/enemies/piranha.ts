import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { Enemy } from "./enemy.js";


export class Piranha extends Enemy {


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(4, 11);

        this.health = 10;
        this.attackPower = 4;

        this.dropProbability = 0.60;

        this.dir = 0;

        this.target.y = 0.0;

        this.friction.x = 0.05;
        this.friction.y = 0.05;

        this.knockbackFactor = 0.75;

        this.coinTypeWeights[0] = 0.40;
        this.coinTypeWeights[1] = 0.60;

        this.collisionBox.w = 8;
        this.collisionBox.h = 8;

        this.hitbox.w = 12;
        this.hitbox.h = 10;

        // this.overriddenHurtbox = new Rectangle(0, 0, 12, 12);
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const FRAME_LENGTH : number = 6;

        this.sprite.animate(this.sprite.getRow(), 4, 7, FRAME_LENGTH, event.tick);
    }


    protected playerEvent(player: Player, event: ProgramEvent): void {
        
        const FOLLOW_SPEED : number = 0.50;

        if (this.hurtTimer > 0) {

            this.target.zeros();
            return;
        }

        const ppos : Vector = player.getPosition();

        this.flip = ppos.x > this.pos.x ? Flip.Horizontal : Flip.None;

        const dir : Vector = Vector.direction(this.pos, ppos);

        this.target.x = dir.x*FOLLOW_SPEED;
        this.target.y = dir.y*FOLLOW_SPEED;
    }


    public waterCollision(x : number, y : number, w : number, h : number, 
        event : ProgramEvent, surface : boolean = false) : boolean {
        
        const OFFSET_Y : number = -4;

        if (!this.isActive()) {

            return false;
        }
    
        if (surface) {

            this.slopeCollision(x, y + OFFSET_Y, x + w, y + OFFSET_Y, -1, event);
        }
    }
}
