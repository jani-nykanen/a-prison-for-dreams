import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Flip } from "../../gfx/interface.js";
import { TextBox } from "../../ui/textbox.js";
import { Player } from "../player.js";
import { Interactable } from "./interactable.js";


export class NPC extends Interactable {


    private id : number = 0;

    private readonly dialogueBox : TextBox;


    constructor(x : number, y : number, id : number, 
        bitmap : Bitmap | undefined, dialogueBox : TextBox) {

        super(x, y, bitmap);

        this.id = id - 1;
        this.dialogueBox = dialogueBox;

        this.hitbox.w = 12;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 10;

        this.sprite.animate(0, 0, 3, ANIMATION_SPEED, event.tick);
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        this.flip = player.getPosition().x < this.pos.x ? Flip.None : Flip.Horizontal;
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
        const text : string[] = event.localization?.getItem("npc" + String(this.id)) ?? ["null"];

        this.dialogueBox.addText(text);
        this.dialogueBox.activate(false, 0);
    }

}
