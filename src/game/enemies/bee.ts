import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const RUSH_TIME : number = 150;


export class Bee extends Enemy {

    private timer : number = 0;

    private moveDirection : Vector;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(4, 7);

        this.health = 5;
        this.attackPower = 3;

        this.dropProbability = 0.33;

        this.dir = 0;

        this.target.zeros();

        this.friction.x = 0.0075;
        this.friction.y = 0.0075;

        this.ignoreBottomLayer = true;

        this.knockbackFactor = 0.75;

        this.coinTypeWeights[0] = 0.90;
        this.coinTypeWeights[1] = 0.10;

        this.bounceFactor.x = 1.0;
        this.bounceFactor.y = 1.0;

        this.moveDirection = new Vector();

        this.timer = RUSH_TIME/2;

        this.hitbox.w = 10;
        this.hitbox.h = 12;

        this.collisionBox.w = 8;
        this.collisionBox.h = 8;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const RUSH_SPEED : number = 1.5;
        const animationSpeed : number = Math.max(Math.round(5.0 - Math.abs(this.speed.length)*2), 1);

        this.sprite.animate(this.sprite.getRow(), 4, 7, animationSpeed, event.tick);

        this.timer += event.tick;
        if (this.timer >= RUSH_TIME) {

            this.speed = Vector.scalarMultiply(this.moveDirection, RUSH_SPEED);
            this.timer -= RUSH_TIME;
        }
    }


    protected enemyCollisionEvent(enemy : Enemy, event : ProgramEvent) : void {

        this.speed.x *= -0.75;
        this.speed.y *= -0.75;

        // this.speed.x = this.target.x;
        // this.speed.y = this.target.y;
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        this.moveDirection = Vector.direction(this.pos, player.getPosition());
    }
}