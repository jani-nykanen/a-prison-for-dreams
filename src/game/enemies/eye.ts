import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Effect, Flip } from "../../gfx/interface.js";
import { Rectangle } from "../../math/rectangle.js";
import { Player } from "../player.js";
import { Enemy } from "./enemy.js";


const INITIAL_Y : number = 96;


export class Eye extends Enemy {


    private initialPosReached : boolean = false;


    constructor(x : number, y : number) {

        super(x, y);

        this.sprite.resize(64, 64);
        this.sprite.setFrame(1, 0);

        this.health = 100;
        this.attackPower = 4;

        this.dropProbability = 0.0;

        this.collisionBox = new Rectangle(0, 0, 48, 48);
        this.hitbox = new Rectangle(0, 0, 48, 48);

        this.target.zeros();
    }


    private reachInitialPos(event : ProgramEvent) : void {

        this.speed.y = -0.5 - (this.pos.y - INITIAL_Y)/64;
        this.target.y = this.speed.y;
    }


    protected updateLogic(event : ProgramEvent) : void {
        
        if (!this.initialPosReached) {

            this.reachInitialPos(event);
            return;
        }
    }


    protected postMovementEvent(event: ProgramEvent): void {
        
        if (!this.initialPosReached && this.pos.y < INITIAL_Y) {

            this.pos.y = INITIAL_Y;
            this.initialPosReached = true;

            this.target.zeros();
            this.speed.zeros();
        }
    }
    

    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        
    }


    public draw(canvas : Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.exist || !this.inCamera) {

            return;
        }

        const bmpEye : Bitmap | undefined = assets.getBitmap("eye");

        const flicker : boolean = !this.dying && this.hurtTimer > 0 &&
            Math.floor(this.hurtTimer/4) % 2 != 0;

        // Flicker if hurt
        if (flicker) {

            canvas.applyEffect(Effect.FixedColor);
            canvas.setColor(255, 255, 255);
        }

        const dx : number = this.pos.x - this.sprite.width/2;
        const dy : number = this.pos.y - this.sprite.height/2;

        this.sprite.draw(canvas, bmpEye, dx, dy, this.flip);

        if (flicker) {

            canvas.applyEffect(Effect.None);
        }
    }


    public hasReachedInitialPos() : boolean {

        return this.initialPosReached;
    }
}