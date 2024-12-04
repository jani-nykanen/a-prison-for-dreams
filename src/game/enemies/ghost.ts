import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 0.50;


export class Ghost extends Enemy {


    private wave : number = 0;


    constructor(x : number, y : number, dir : number) {

        super(x, y);

        this.sprite.setFrame(0, 10);

        this.health = 1;
        this.attackPower = 2;

        this.dropProbability = 0.50;
        this.doesNotDropCoins = true;

        this.dir = dir;

        this.target.y = 0.0;

        this.wave = Math.random()*Math.PI*2;

        this.takeCollisions = false;

        this.cameraCheckArea.x = 1024;
        this.cameraCheckArea.y = 1024;

        this.flip = dir < 0 ? Flip.None : Flip.Horizontal;

        this.bodyOpacity = 0.75;

        this.speed.x = BASE_SPEED*this.dir;
        this.target.x = this.speed.x;

        this.canBeMoved = false;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 8;
        const WAVE_SPEED : number = Math.PI*2/120.0;
        const AMPLITUDE : number = 16.0;
        // TODO: Obtain from... somewhere?
        const RIGHT_END : number = 352;

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        this.pos.y = this.initialPos.y + Math.sin(this.wave)*AMPLITUDE;

        if ((this.dir < 0 && this.pos.x < -this.sprite.width/2) || 
            (this.dir > 0 && this.pos.x > RIGHT_END + this.sprite.width/2)) {

            this.exist = false;
        }
    }
}
