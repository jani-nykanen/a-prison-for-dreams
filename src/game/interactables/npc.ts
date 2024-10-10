import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Flip } from "../../gfx/interface.js";
import { Player } from "../player.js";
import { Interactable } from "./interactable.js";


export class NPC extends Interactable {


    private id : number = 0;


    constructor(x : number, y : number, id : number, bitmap : Bitmap | undefined) {

        super(x, y, bitmap);

        this.id = id;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 10;

        this.sprite.animate(0, 0, 3, ANIMATION_SPEED, event.tick);
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        this.flip = player.getPosition().x < this.pos.x ? Flip.None : Flip.Horizontal;
    }

}
