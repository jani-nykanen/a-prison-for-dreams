import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { Enemy } from "./enemy.js";


export class RedGhost extends Enemy {


    private wave : number = 0;
    private attackTimer : number = 0;
    private attackPhase : number = 0;

    private targetDir : Vector;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(0, 14);

        this.health = 10;
        this.attackPower = 4;

        this.dropProbability = 0.90;

        this.dir = 0;

        this.target.y = 0.0;

        this.friction.x = 0.0625;
        this.friction.y = 0.0625;

        this.knockbackFactor = 0.80;

        this.coinTypeWeights[0] = 0.10;
        this.coinTypeWeights[1] = 0.90;

        this.collisionBox.w = 8;
        this.collisionBox.h = 8;

        this.hitbox.w = 10;
        this.hitbox.h = 10;

        this.overriddenHurtbox = new Rectangle(0, 0, 12, 12);

        this.takeCollisions = false;
        this.bodyOpacity = 0.75;

        this.targetDir = new Vector(1, 0);
    }


    private shoot(event : ProgramEvent) : void {

        const SHOOT_SPEED : number = 1.5;

        this.projectiles?.next().spawn(
            this.pos.x, this.pos.y, 
            this.pos.x + this.dir*2, this.pos.y - 1, 
            this.targetDir.x*SHOOT_SPEED, this.targetDir.y*SHOOT_SPEED, 
            7, 5, false);

        event.audio.playSample(event.assets.getSample("throw"), 0.50);
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const FRAME_LENGTH : number = 8;
        const WAVE_SPEED : number = Math.PI*2/300.0;

        const PREPARE_TIME : number = 120;
        const ATTACK_PHASE_TIME : number = 20;

        this.attackTimer += event.tick;

        const phaseTime : number = this.attackPhase == 0 ? PREPARE_TIME : ATTACK_PHASE_TIME;
        if (this.attackTimer >= phaseTime) {

            this.attackPhase = (this.attackPhase + 1) % 3;
            this.attackTimer = 0;

            if (this.attackPhase == 2) {

                this.shoot(event);
            }
        }

        if (this.attackPhase != 0) {

            this.target.zeros();
            this.sprite.setFrame(3 + this.attackPhase, this.sprite.getRow());
            return;
        }

        this.sprite.animate(this.sprite.getRow(), 0, 3, FRAME_LENGTH, event.tick);
        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
    }


    protected playerEvent(player: Player, event: ProgramEvent): void {
        
        const BASE_DISTANCE : number = 48;
        const FOLLOW_SPEED : number = 0.625;

        const ppos : Vector = player.getPosition();
        this.targetDir = Vector.direction(this.pos, ppos);

        this.flip = ppos.x > this.pos.x ? Flip.Horizontal : Flip.None;

        if (this.hurtTimer > 0 || this.attackPhase > 0) {

            this.target.zeros();
            return;
        }

        ppos.x += Math.sin(this.wave)*BASE_DISTANCE;
        ppos.y += Math.cos(this.wave)*BASE_DISTANCE;

        const dir : Vector = Vector.direction(this.pos, ppos);

        this.target.x = dir.x*FOLLOW_SPEED;
        this.target.y = dir.y*FOLLOW_SPEED;
    }
}