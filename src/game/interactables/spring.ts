import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { TextBox } from "../../ui/textbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player, WaitType } from "../player.js";
import { Interactable } from "./interactable.js";


export class Spring extends Interactable {



    constructor(x : number, y : number, bitmap : Bitmap | undefined) {

        super(x, y, bitmap);

        this.hitbox.w = 24;

        this.sprite = new Sprite(32, 24);

        // this.spriteOffset.y = -8;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        // ...
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        // TODO: Act as a "spring"
    }

}
