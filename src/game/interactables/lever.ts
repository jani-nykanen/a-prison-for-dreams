import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Flip } from "../../gfx/interface.js";
import { TextBox } from "../../ui/textbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player, WaitType } from "../player.js";
import { Interactable } from "./interactable.js";



export class Lever extends Interactable {


    private id : number = 0;
    private pulled : boolean = false;

    private readonly dialogueBox : TextBox;


    constructor(x : number, y : number, id : number, bitmap : Bitmap | undefined, dialogueBox : TextBox) {

        super(x, y, bitmap);

        this.id = id;
        this.dialogueBox = dialogueBox;

        this.hitbox.w = 12;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        // ...
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        if (this.pulled) {

            return;
        }

        if (initial) {
            
            this.pulled = player.stats.hasPulledLever(this.id);
            if (this.pulled) {

                this.canBeInteracted = false;
                this.sprite.setFrame(1, 0);
            }
        }
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
        const PULL_TIME : number = 60;

        event.audio.pauseMusic();
        event.audio.playSample(event.assets.getSample("lever"), 0.70);

        this.pulled = true;
        this.canBeInteracted = false;
        this.sprite.setFrame(1, 0);

        const messageID : number = this.id < 5 ? 1 : 2;
        const itemText = event.localization?.getItem(`lever${messageID}`) ?? ["null"];

        player.stats.markLeverPulled(this.id);

        player.startWaiting(PULL_TIME, WaitType.ToggleLever, 0, (event : ProgramEvent) : void => {

            this.dialogueBox.addText(itemText);
            this.dialogueBox.activate(false, null, (event : ProgramEvent) : void => {

                player.stats.save();
                event.audio.resumeMusic();
            }); 

            player.setCheckpointObject(this);
        });
    }

}
