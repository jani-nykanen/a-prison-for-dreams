import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Rectangle } from "../../math/rectangle.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number[] = [0.50, 1.0];


export class Ghost extends Enemy {


    private wave : number = 0;
    private type : number = 0;

    private rightSide : number;


    constructor(x : number, y : number, dir : number, 
        rightSide : number, type : number = 0) {

        super(x, y);

        this.sprite.setFrame(0, 10 + type*4);

        this.health = 1;
        this.attackPower = type == 0 ? 2 : 3;

        this.dropProbability = type == 0 ? 0.50 : 1.0;
        this.doesNotDropCoins = true;

        this.rightSide = rightSide;

        this.dir = dir;

        this.target.y = 0.0;

        this.wave = Math.random()*Math.PI*2;

        this.takeCollisions = false;

        this.cameraCheckArea.x = 1024;
        this.cameraCheckArea.y = 1024;

        this.flip = dir < 0 ? Flip.None : Flip.Horizontal;

        this.bodyOpacity = 0.75;

        this.speed.x = (BASE_SPEED[this.type] ?? 0.5)*this.dir;
        this.target.x = this.speed.x;

        this.canBeMoved = false;
    
        this.hitbox.w = 12;
        this.hitbox.h = 12;
        
        this.overriddenHurtbox = new Rectangle(0, 0, 10, 10);

        this.type = type;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 8;
        const WAVE_SPEED : number = Math.PI*2/120.0;
        const AMPLITUDE : number = 16.0;

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        this.pos.y = this.initialPos.y + Math.sin(this.wave)*AMPLITUDE;

        if ((this.dir < 0 && this.pos.x < -this.sprite.width/2) || 
            (this.dir > 0 && this.pos.x > this.rightSide + this.sprite.width/2)) {

            this.exist = false;
        }
    }
}
