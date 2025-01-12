import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { ConfirmationBox } from "../../ui/confirmationbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player, WaitType } from "../player.js";
import { Interactable } from "./interactable.js";


export class FinalBossTrigger extends Interactable {


    private confirmationBox : ConfirmationBox;
    private wave : number = 0;

    private readonly triggerEvent : () => void;


    constructor(x : number, y : number, confirmationBox : ConfirmationBox,
        triggerEvent : () => void) {

        super(x, y, undefined);

        this.hitbox.w = 32;

        this.cameraCheckArea.x = 64;
        this.cameraCheckArea.y = 64;

        this.confirmationBox = confirmationBox;

        this.triggerEvent = triggerEvent;

        this.sprite = new Sprite(32, 32);
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const WAVE_SPEED : number = Math.PI*2/90.0;
        const FRAME_TIME : number = 6;

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        this.sprite.animate(0, 0, 3, FRAME_TIME, event.tick);
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        // ...
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
        event.audio.playSample(event.assets.getSample("select"), 0.40);

        this.confirmationBox.activate(1, undefined, 
            (event : ProgramEvent) : void => {

                player.setPosition(this.pos.x, this.pos.y);

                this.confirmationBox.deactivate();
                this.triggerEvent();
            }
        );
    }


    public draw(canvas : Canvas, assets : Assets) : void {
        
        const AMPLITUDE : number = 2;
        const YOFF : number = 26;

        if (!this.isActive()) {

            return;
        }

        const dx : number = this.pos.x - 16;
        const dy : number = this.pos.y - YOFF + Math.round(Math.sin(this.wave)*AMPLITUDE);

        const bmpSpirit : Bitmap | undefined = assets.getBitmap("spirit");

        // Body
        this.sprite.draw(canvas, bmpSpirit, dx, dy);
        // Eyes
        canvas.drawBitmap(bmpSpirit, Flip.None, dx, dy, 128, 0, 32, 32);
    }

}
