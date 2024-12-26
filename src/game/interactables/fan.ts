import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { Rectangle } from "../../math/rectangle.js";
import { negMod } from "../../math/utility.js";
import { Vector } from "../../math/vector.js";
import { TextBox } from "../../ui/textbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player, WaitType } from "../player.js";
import { Interactable } from "./interactable.js";


const DIRX : number[] = [0, 1, 0, -1];
const DIRY : number[] = [-1, 0, 1, 0];


// I'm lazy
const FAN_LEVER : number = 5;


// There are only fans here


export class Fan extends Interactable {


    private direction : number;
    private activated : boolean = false;
    private windTimer : number = 0.0;


    constructor(x : number, y : number, bitmap : Bitmap | undefined, direction : number) {

        super(x, y, bitmap);

        this.sprite = new Sprite(24, 24);

        this.direction = negMod(Math.floor(direction), 4);

        this.computeHitbox();

        this.cameraCheckArea.x = 128;
        this.cameraCheckArea.y = 128;
    }


    private computeHitbox() : void {

        const WIDTH : number = 16;
        const HEIGHT : number = 64;

        if (this.direction % 2 == 0) {

            this.hitbox.w = WIDTH;
            this.hitbox.h = HEIGHT;

            this.hitbox.y = -HEIGHT/2;
            if (this.direction == 2) {

                this.hitbox.y *= -1;
            }
            return;
        }

        this.hitbox.h = WIDTH;
        this.hitbox.w = HEIGHT;

        this.hitbox.x = HEIGHT/2;
        if (this.direction == 3) {

            this.hitbox.x *= -1;
        }
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const FRAME_TIME : number = 3.0;
        const WIND_SPEED : number = 1.0/8.0;

        if (this.activated) {

            this.sprite.animate(0, 0, 3, FRAME_TIME, event.tick);
            this.windTimer = (this.windTimer + WIND_SPEED*event.tick) % 1.0;
        }
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        this.activated = player.stats.hasPulledLever(FAN_LEVER);
    }


    protected playerCollisionEvent(player : Player, event : ProgramEvent, initialCollision? : boolean): void {
        
        const BASE_SPEED : number = 0.5;
        const CAP_X : number = 4.0;
        const CAP_Y : number = 4.0;

        if (!this.activated) {

            return;
        }

        player.alterSpeed(
            BASE_SPEED*DIRX[this.direction % 4], 
            BASE_SPEED*DIRY[this.direction % 4],
            CAP_X, CAP_Y);
    }


    public draw(canvas: Canvas, assets? : Assets) : void {
        
        if (!this.isActive()) {

            return;
        }   

        // This is required, just don't ask why...
        const cameraTranslation : Vector = canvas.getTranslation();
        canvas.toggleTranslation(false);

        canvas.transform.push();
        canvas.transform.translate(
            this.pos.x + Math.floor(cameraTranslation.x), 
            this.pos.y + Math.floor(cameraTranslation.y));
        if (this.direction != 0) {

            canvas.transform.rotate(this.direction*Math.PI/2);
        }
        canvas.transform.translate(0, -4);
        canvas.transform.apply();

        // Propeller
        this.sprite.draw(canvas, this.bitmap, 
            -this.sprite.width/2, 
            -this.sprite.height/2);

        // Wind
        const shift : number = this.windTimer*16;
        for (let i : number = 0; i < 4; ++ i) {
            
            canvas.drawBitmap(this.bitmap, Flip.None, 
                -this.sprite.width/2, 
                -this.sprite.height/2 - 8 - i*16,
                0, 24 + shift, 24, 16);
        }

        canvas.transform.pop();
        canvas.transform.apply();

        canvas.toggleTranslation(true);
    }

}
