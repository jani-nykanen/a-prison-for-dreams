import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Align, Bitmap, Canvas } from "../../gfx/interface.js";
import { Rectangle } from "../../math/rectangle.js";
import { Vector } from "../../math/vector.js";
import { Player } from "../player.js";
import { Interactable } from "./interactable.js";


const LIFT_TIME : number = 30;
const LIFT_AMOUNT : number = 8;

const TEXT_TIME : number = 60;
const TEXT_STOP_TIME : number = 30;


export class Checkpoint extends Interactable {


    private activated : boolean = false;

    private liftTimer : number = 0.0;
    private initialY : number = 0.0;
    private waveTimer : number = 0.0;

    private textTimer : number = 0;


    constructor(x : number, y : number, bitmap : Bitmap | undefined) {

        super(x, y + 5, bitmap);

        this.initialY = this.pos.y;

        this.hitbox = new Rectangle(0, 0, 16, 16);

        // Large area to ensure that the "Checkpoint!" text stays visible
        this.cameraCheckArea = new Vector(128, 128);
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 6;
        const WAVE_SPEED : number = Math.PI*2/120.0;
        const AMPLITUDE : number = 2.0;

        if (!this.activated) {

            this.pos.y = this.initialY;
            this.sprite.setFrame(0, 0);

            return;
        }
        this.sprite.animate(0, 1, 4, ANIMATION_SPEED, event.tick);

        this.liftTimer = Math.min(LIFT_TIME, this.liftTimer + event.tick);
        if (this.liftTimer >= LIFT_TIME) {

            this.waveTimer = (this.waveTimer + WAVE_SPEED*event.tick) % (Math.PI*2);
        }
        this.pos.y = this.initialY - (this.liftTimer/LIFT_TIME)*LIFT_AMOUNT + Math.round(Math.sin(this.waveTimer)*AMPLITUDE);

        if (this.textTimer > 0) {

            this.textTimer -= event.tick;
        }
    }


    protected playerCollisionEvent(player : Player, event : ProgramEvent) : void {
        
        if (this.activated) {

            return;
        }

        this.activated = true;
        this.liftTimer = 0;
        this.textTimer = TEXT_TIME;

        player.setCheckpointObject(this, new Vector(0, -5));
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        if (!this.activated) {

            return;
        }

        if (!player.isCheckpointObject(this)) {

            this.activated = false;
            this.textTimer = 0;
            this.liftTimer = 0;
            this.waveTimer = 0;
            
            this.sprite.setFrame(0, 0);
        }
    }


    public postDraw(canvas : Canvas, assets : Assets) : void {
        
        const TEXT_TARGET_Y : number = -32;

        if (!this.isActive() || this.textTimer <= 0) {

            return;
        }

        const bmpFontOutlines : Bitmap | undefined = assets.getBitmap("font_outlines");

        const y : number = this.initialY + 
            TEXT_TARGET_Y*Math.max(0, (this.textTimer - TEXT_STOP_TIME)/(TEXT_TIME - TEXT_STOP_TIME));

        canvas.setColor(255, 255, 73);
        canvas.drawText(bmpFontOutlines, "CHECKPOINT!", this.pos.x, y, -8, 0, Align.Center);
        canvas.setColor();
    }
}
