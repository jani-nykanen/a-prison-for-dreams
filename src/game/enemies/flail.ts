import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { TILE_WIDTH } from "../tilesize.js";
import { Enemy } from "./enemy.js";


// Not really a flail, but meh
export class Flail extends Enemy {


    private distance : number = 0.0;
    private angle : number = 0.0;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.setFrame(4, 5);

        this.health = 256;
        this.attackPower = 4;

        this.dropProbability = 0.0;

        this.canBeHurt = false;
        this.canBeMoved = false;
        this.takeCollisions = false;

        this.cameraCheckArea.x = 64;
        this.cameraCheckArea.y = 64;

        this.dir = Math.floor(this.pos.x/TILE_WIDTH) % 2 == 0 ? -1 : 1;

        this.angle = Math.PI/2 - this.dir*Math.PI/2;

        this.speed.zeros();
        this.target.zeros();
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        const MAX_DISTANCE : number = 32;
        const DISTANCE_DELTA : number = MAX_DISTANCE/60;
        const ROTATION_SPEED : number = Math.PI*2/120;

        const ANIMATION_SPEED : number = 5;

        this.sprite.animate(this.sprite.getRow(), 4, 5, ANIMATION_SPEED, event.tick);

        this.distance = Math.min(MAX_DISTANCE, this.distance + DISTANCE_DELTA*event.tick);

        this.pos.x = this.initialPos.x + this.dir*Math.cos(this.angle)*this.distance;
        this.pos.y = this.initialPos.y + Math.sin(this.angle)*this.distance;

        this.angle = (this.angle + ROTATION_SPEED*event.tick) % (Math.PI*2);
    }


    public draw(canvas : Canvas, assets : Assets, bmp : Bitmap | undefined) : void {

        const CHAIN_COUNT : number = 5;

        if (!this.exist || !this.inCamera) {

            return;
        }

        const dx : number = this.pos.x - this.sprite.width/2;
        const dy : number = this.pos.y - this.sprite.height/2;

        // Chain
        const distDelta : number = this.distance/(CHAIN_COUNT);

        const c : number = this.dir*Math.cos(this.angle);
        const s : number = Math.sin(this.angle);

        for (let i : number = 0; i < CHAIN_COUNT; ++ i) {

            const distance : number = distDelta*i;

            const chainx : number = Math.round(this.initialPos.x + c*distance);
            const chainy : number = Math.round(this.initialPos.y + s*distance);

            canvas.drawBitmap(bmp, Flip.None, chainx - 12, chainy - 12, 144, 120, 24, 24);
        }

        // Body
        this.sprite.draw(canvas, bmp, dx, dy, this.flip);
    }
}
