import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Flip } from "../../gfx/interface.js";
import { TextBox } from "../../ui/textbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player } from "../player.js";
import { Interactable } from "./interactable.js";


export class HintTrigger extends Interactable {


    private id : number = 0;

    private readonly hints : HintRenderer;


    constructor(x : number, y : number, id : number, hints : HintRenderer) {

        super(x, y);

        this.id = id;

        this.hints = hints;

        this.hitbox.w = 12;
        this.hitbox.h = 256;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 10;

        this.sprite.animate(this.sprite.getRow(), 0, 3, ANIMATION_SPEED, event.tick);
    }


    protected playerEvent(player : Player, event : ProgramEvent, initialEvent : boolean) : void {
        
        if (initialEvent) {
            
            if (player.stats.hasShownHint(this.id)) {

                this.exist = false;
                return;
            }
        }
    }


    protected playerCollisionEvent(player: Player, event: ProgramEvent, initialCollision?: boolean): void {
        
        const text : string = (event.localization?.getItem("hints") ?? [])[this.id] ?? "null";

        this.hints.activate(this.pos, text);
        this.exist = false;

        player.stats.markHintAsShown(this.id);
    }

}
