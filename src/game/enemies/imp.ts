import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Vector } from "../../math/vector.js";
import { GameObject } from "../gameobject.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const FOLLOW_SPEED : number = 0.50;
const SHOOT_TIME : number = 150;
const SHOOT_RECOVER_TIME : number = 30;


export class Imp extends Enemy {


    private shootTimer : number = 0;
    private shootRecover : number = 0;

    private targetDir : Vector;

    private playerRef : GameObject | undefined = undefined;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(3, 13);

        this.health = 12;
        this.attackPower = 4;

        this.dropProbability = 0.80;

        this.dir = 0;

        this.target.y = 0.0;

        this.friction.x = 0.025;
        this.friction.y = 0.025;

        this.ignoreBottomLayer = true;

        this.knockbackFactor = 0.75;

        this.coinTypeWeights[0] = 0.20;
        this.coinTypeWeights[1] = 0.80;

        this.targetDir = new Vector();
    }


    private shoot() : void {

        const PROJECTILE_SPEED : number = 1.75;

        if (this.playerRef === undefined) {

            return;
        }

        const dir : Vector = Vector.direction(this.pos, this.playerRef.getPosition());
        this.projectiles?.next().spawn(
            this.pos.x, this.pos.y, 
            this.pos.x + this.dir*2, this.pos.y - 1, 
            dir.x*PROJECTILE_SPEED, dir.y*PROJECTILE_SPEED, 
            4, 4, false, -1, this.playerRef, PROJECTILE_SPEED);
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 6;

        if (this.shootRecover > 0) {

            this.shootRecover -= event.tick;
            return;
        }

        this.sprite.animate(this.sprite.getRow(), 3, 6, ANIMATION_SPEED, event.tick);

        this.shootTimer += event.tick;
        if (this.shootTimer >= SHOOT_TIME) {

            this.shootTimer -= SHOOT_TIME;
            this.shoot();

            event.audio.playSample(event.assets.getSample("throw"), 0.50);

            this.shootRecover = SHOOT_RECOVER_TIME;

            this.sprite.setFrame(7, this.sprite.getRow());
        }
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {

        const TARGET_DISTANCE : number = 64;

        const ppos : Vector = player.getPosition();
        this.targetDir = Vector.direction(this.pos, ppos);

        this.playerRef = player;

        if (this.shootRecover > 0) {

            this.target.zeros();
            return;
        }

        this.flip = ppos.x > this.pos.x ? Flip.Horizontal : Flip.None;

        const sign : number = Math.sign(Vector.distance(this.pos, ppos) - TARGET_DISTANCE);

        this.target.x = sign*this.targetDir.x*FOLLOW_SPEED;
        this.target.y = sign*this.targetDir.y*FOLLOW_SPEED;
    }
}
