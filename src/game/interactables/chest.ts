import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Flip } from "../../gfx/interface.js";
import { TextBox } from "../../ui/textbox.js";
import { Player } from "../player.js";
import { Interactable } from "./interactable.js";


// Don't take this out of context, please.
export const enum ChestType {

    Unknown = 0,
    Treasure = 1,
    Health = 2,
    Bullets = 3,
    BloodShard = 4, // TODO: Might rename this
}


export class Chest extends Interactable {


    private id : number = 0;
    private type : ChestType = ChestType.Unknown;
    private opened : boolean = false;

    private readonly dialogueBox : TextBox;


    constructor(x : number, y : number, id : number, type : ChestType,
        bitmap : Bitmap | undefined, dialogueBox : TextBox) {

        super(x, y, bitmap);

        this.id = id - 1;
        this.type = type;
        this.dialogueBox = dialogueBox;

        this.hitbox.w = 12;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 10;

        if (this.opened) {

            this.sprite.setFrame(4, this.type - 1);
            return;
        }

        this.sprite.animate(this.type - 1, 0, 3, ANIMATION_SPEED, event.tick);
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        if (this.opened) {

            return;
        }

        this.flip = player.getPosition().x < this.pos.x ? Flip.None : Flip.Horizontal;

        if (initial) {

            // TODO: Check if the player has the item contained in the chest
        }
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
        /*
        const text : string[] = event.localization?.getItem("npc" + String(this.id)) ?? ["null"];

        this.dialogueBox.addText(text);
        this.dialogueBox.activate(false, 0);
        */

        this.opened = true;
        this.canBeInteracted = false;
    }

}