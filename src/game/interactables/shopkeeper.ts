import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { TextBox } from "../../ui/textbox.js";
import { Player } from "../player.js";
import { Shop } from "../shop.js";
import { Interactable } from "./interactable.js";


export class Shopkeeper extends Interactable {


    private shop : Shop;


    constructor(x : number, y : number, shop : Shop, bitmap : Bitmap | undefined) {

        super(x, y - 32, bitmap);

        this.hitbox.w = 24;
        this.hitbox.y = 32;

        this.shop = shop;

        this.sprite = new Sprite(32, 48);
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 10;

        this.sprite.animate(0, 0, 3, ANIMATION_SPEED, event.tick);
    }


    protected playerEvent(player : Player, event : ProgramEvent) : void {
        
        this.flip = player.getPosition().x < this.pos.x ? Flip.None : Flip.Horizontal;
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
        event.audio.playSample(event.assets.getSample("select"), 0.40);

        this.shop.activate(player.stats);
    }

}
