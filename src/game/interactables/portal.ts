import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { Vector } from "../../math/vector.js";
import { TextBox } from "../../ui/textbox.js";
import { Player } from "../player.js";
import { TILE_HEIGHT } from "../tilesize.js";
import { Interactable } from "./interactable.js";


export class Portal extends Interactable {


    constructor(x : number, y : number,  bitmap : Bitmap | undefined) {

        super(x, y - 24, bitmap);

        this.hitbox.y = 16;
        this.hitbox.w = 16;

        this.cameraCheckArea = new Vector(48, 64);

        this.sprite = new Sprite(32, 48);
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 4;

        this.sprite.animate(0, 0, 7, ANIMATION_SPEED, event.tick);
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
    }
}
