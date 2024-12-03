import { ProgramEvent } from "../../core/event.js";
import { Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


const BASE_SPEED : number = 0.33;


export class Ghost extends Enemy {


    private wave : number = 0;


    constructor(x : number, y : number, dir : number) {

        super(x, y);

        this.sprite.setFrame(0, 10);

        this.health = 8;
        this.attackPower = 3;

        this.dropProbability = 0.25;

        this.dir = dir;

        this.target.y = 0.0;

        this.wave = Math.random()*Math.PI*2;

        this.takeCollisions = false;

        this.cameraCheckArea.x = 1024;
        this.cameraCheckArea.y = 1024;

        this.flip = dir < 0 ? Flip.None : Flip.Horizontal;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 8;
        const WAVE_SPEED : number = Math.PI*2/60.0;
        const AMPLITUDE : number = 8.0;
        // TODO: Obtain from... somewhere?
        const RIGHT_END : number = 352;

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);

        this.target.x = BASE_SPEED*this.dir;
        // this.speed.x = this.target.x;

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        this.pos.y = this.initialPos.y + Math.sin(this.wave)*AMPLITUDE;

        if ((this.dir < 0 && this.pos.x < -this.sprite.width/2) || 
            (this.dir > 0 && this.pos.x > RIGHT_END + this.sprite.width/2)) {

            console.log("Gone.");
            this.exist = false;
        }
    }
}
