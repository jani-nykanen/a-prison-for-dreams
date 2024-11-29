import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { ConfirmationBox } from "../../ui/confirmationbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player, WaitType } from "../player.js";
import { Interactable } from "./interactable.js";



export class EyeTrigger extends Interactable {


    private confirmationBox : ConfirmationBox;
    private wave : number = 0;


    constructor(x : number, y : number, confirmationBox : ConfirmationBox) {

        super(x, y, undefined);

        this.hitbox.w = 24;

        this.cameraCheckArea.x = 64;
        this.cameraCheckArea.y = 64;

        this.confirmationBox = confirmationBox;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const WAVE_SPEED : number = Math.PI*2/120.0;

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        // ...
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
        this.confirmationBox.activate(1, undefined, 
            (event : ProgramEvent) : void => {

                player.setPosition(this.pos.x, this.pos.y);

                this.confirmationBox.deactivate();
                player.startWaiting(60, WaitType.Licking, undefined, (event : ProgramEvent) : void => {

                    // ...
                });
            }
        );
    }


    public draw(canvas : Canvas, assets : Assets) : void {
        
        const PERIOD : number = 64;
        const AMPLITUDE : number = 4;

        if (!this.isActive()) {

            return;
        }

        const bmpEye : Bitmap | undefined = assets.getBitmap("eye");

        // canvas.drawBitmap(bmpEye, Flip.None, this.pos.x - 32, this.pos.y - 56, 0, 0, 64, 64);

        canvas.drawHorizontallyWavingBitmap(bmpEye, 
            AMPLITUDE, PERIOD, this.wave, 
            Flip.None, this.pos.x - 32 - Math.sin(this.wave)*AMPLITUDE, this.pos.y - 56, 0, 0, 64, 64);
    }

}
