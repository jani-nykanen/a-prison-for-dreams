import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { Enemy } from "./enemy.js";


export class Spook extends Enemy {


    private wave : number = 0;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(0, 10);

        this.health = 8;
        this.attackPower = 4;

        this.dropProbability = 0.40;

        this.dir = 0;

        this.target.y = 0.0;

        this.friction.x = 0.05;
        this.friction.y = 0.05;

        this.knockbackFactor = 0.75;

        this.coinTypeWeights[0] = 0.60;
        this.coinTypeWeights[1] = 0.40;

        this.collisionBox.w = 8;
        this.collisionBox.h = 8;

        this.hitbox.w = 12;
        this.hitbox.h = 12;

        this.overriddenHurtbox = new Rectangle(0, 0, 10, 10);

        this.takeCollisions = false;
        this.bodyOpacity = 0.75;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const FRAME_LENGTH : number = 8;
        const WAVE_SPEED : number = Math.PI*2/300.0;

        this.sprite.animate(this.sprite.getRow(), 0, 3, FRAME_LENGTH, event.tick);
        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
    }


    protected playerEvent(player: Player, event: ProgramEvent): void {
        
        const BASE_DISTANCE : number = 48;
        const FOLLOW_SPEED : number = 0.50;

        if (this.hurtTimer > 0) {

            this.target.zeros();
            return;
        }

        const ppos : Vector = player.getPosition();

        this.flip = ppos.x > this.pos.x ? Flip.Horizontal : Flip.None;

        ppos.x += Math.sin(this.wave)*BASE_DISTANCE;
        ppos.y += Math.cos(this.wave)*BASE_DISTANCE;


        const dir : Vector = Vector.direction(this.pos, ppos);

        this.target.x = dir.x*FOLLOW_SPEED;
        this.target.y = dir.y*FOLLOW_SPEED;
    }
}