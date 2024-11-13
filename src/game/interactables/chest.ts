import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Flip } from "../../gfx/interface.js";
import { TextBox } from "../../ui/textbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player, WaitType } from "../player.js";
import { Interactable } from "./interactable.js";


const ITEM_HINT_LOOKUP : (number | undefined)[] = [

    undefined,
    2,
    3,
];


// Don't take this out of context, please.
export const enum ChestType {

    Unknown = 0,
    Treasure = 1,
    Health = 2,
    Bullets = 3,
    DreamOrb = 4, 
}


export class Chest extends Interactable {


    private id : number = 0;
    private type : ChestType = ChestType.Unknown;
    private opened : boolean = false;

    private readonly dialogueBox : TextBox;
    private readonly hints : HintRenderer;


    constructor(x : number, y : number, id : number, type : ChestType,
        bitmap : Bitmap | undefined, dialogueBox : TextBox, hints : HintRenderer) {

        super(x, y, bitmap);

        this.id = id - 1;
        this.type = type;
        this.dialogueBox = dialogueBox;
        this.hints = hints;

        this.hitbox.w = 12;

        this.sprite.setFrame(Math.floor(Math.random()*4), type - 1);
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 10;

        if (this.opened) {

            // this.sprite.setFrame(4, this.type - 1);
            return;
        }

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        if (this.opened) {

            return;
        }

        this.flip = player.getPosition().x < this.pos.x ? Flip.None : Flip.Horizontal;

        if (initial) {
            
            let opened : boolean = false;
            switch (this.type) {

            case ChestType.Treasure:

                opened = player.stats.hasItem(this.id);
                break;

            case ChestType.Health:

                opened = player.stats.hasObtainedHealthUp(this.id);
                break;

            case ChestType.Bullets:

                opened = player.stats.hasObtainedAmmoUp(this.id);
                break;

            case ChestType.DreamOrb:

                opened = player.stats.hasDreamOrb(this.id);
                break;

            default:
                break;
            }

            if (opened) {

                this.opened = true;
                this.canBeInteracted = false;

                this.sprite.setFrame(4, this.type - 1);
            }
        }
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
        const OPEN_TIME : number = 120;

        event.audio.pauseMusic();
        event.audio.playSample(event.assets.getSample("item"), 1.0);

        this.opened = true;
        this.canBeInteracted = false;
        this.sprite.setFrame(4, this.type - 1);

        let itemID : number = 0;
        let itemText : string[] = [];
        switch (this.type) {

        case ChestType.Treasure:

            player.stats.obtainItem(this.id);
            itemID = this.id;
            itemText = event.localization?.getItem("item" + String(this.id)) ?? ["null"];
            break;

        case ChestType.Health:

            player.stats.obtainHealthUp(this.id);
            itemID = 16;
            itemText = event.localization?.getItem("healthup") ?? ["null"];
            break;

        case ChestType.Bullets:

            player.stats.obtainAmmoUp(this.id);
            itemID = 17;
            itemText = event.localization?.getItem("ammoup") ?? ["null"];
            break;

        case ChestType.DreamOrb:

            player.stats.obtainDreamOrb(this.id);
            itemID = 18;
            itemText = event.localization?.getItem("dreamorb") ?? ["null"];
            break;

        default:
            break;
        }

        player.startWaiting(OPEN_TIME, WaitType.HoldingItem, itemID, (event : ProgramEvent) : void => {

            this.dialogueBox.addText(itemText);
            this.dialogueBox.activate(false, null, (event : ProgramEvent) : void => {

                player.stats.save();

                const hintID : number | undefined = ITEM_HINT_LOOKUP[this.id];
                if (hintID !== undefined) {

                    this.hints.activate(this.pos, (event.localization?.getItem("hints") ?? [])[hintID] ?? "null");

                    // This is actually redundant now
                    player.stats.markHintAsShown(hintID);
                }
                event.audio.resumeMusic();
            }); 

            player.setCheckpointObject(this);
        });
    }

}
