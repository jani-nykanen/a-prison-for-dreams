import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { ConfirmationBox } from "../../ui/confirmationbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player, WaitType } from "../player.js";
import { Interactable } from "./interactable.js";



export class EyeTrigger extends Interactable {


    private confirmationBox : ConfirmationBox;


    constructor(x : number, y : number) {

        super(x, y, undefined);

        this.hitbox.w = 16;

        this.cameraCheckArea.x = 64;
        this.cameraCheckArea.y = 64;

        // this.confirmationBox = ...
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        // ...
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        // ...
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
        // ....
    }


    public draw(canvas : Canvas, assets : Assets) : void {
        
        if (!this.isActive()) {

            return;
        }

        const bmpEye : Bitmap | undefined = assets.getBitmap("eye");

        canvas.drawBitmap(bmpEye, Flip.None, this.pos.x - 32, this.pos.y - 56, 0, 0, 64, 64);
    }

}
