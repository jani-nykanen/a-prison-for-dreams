import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { GameObject } from "../gameobject.js";
import { Sprite } from "../../gfx/sprite.js";
import { Player } from "../player.js";
import { ProgramEvent } from "../../core/event.js";
import { Vector } from "../../math/vector.js";
import { Assets } from "../../core/assets.js";
import { Rectangle } from "../../math/rectangle.js";


// Yes, "Interactable" is a word, I checked the
// dictionary.
export class Interactable extends GameObject {


    protected bitmap : Bitmap | undefined = undefined;
    protected flip : Flip = Flip.None;
    protected sprite : Sprite;

    protected canBeInteracted : boolean = true;


    constructor(x : number, y : number, bitmap? : Bitmap | undefined) {

        super(x, y, true);

        this.sprite = new Sprite(24, 24);

        this.cameraCheckArea = new Vector(32, 32);

        this.hitbox = new Rectangle(0, 2, 12, 12);

        this.bitmap = bitmap;
    }


    protected playerEvent?(player : Player, event : ProgramEvent) : void;
    protected interactionEvent?(player : Player, event : ProgramEvent) : void;
    protected playerCollisionEvent?(player : Player, event : ProgramEvent, initialCollision? : boolean) : void;


    public postDraw?(canvas : Canvas, assets? : Assets) : void;


    public playerCollision(player : Player, event : ProgramEvent, initialCollision : boolean = false) : void {

        if (!this.isActive() || !player.isActive()) {

            return;
        }

        this.playerEvent?.(player, event);

        if (this.playerCollisionEvent !== undefined && this.overlayObject(player)) {

            this.playerCollisionEvent(player, event, initialCollision);
        }

        if (this.canBeInteracted && player.doesTouchSurface()) {

            if (this.interactionEvent !== undefined && this.overlayObject(player)) {
                
                player.showIcon(1);
                if (event.input.upPress()) {

                    player.showIcon(0);
                    this.interactionEvent(player, event);
                }
            }
        }
    }


    public draw(canvas : Canvas) : void {

        if (!this.isActive() || this.bitmap === undefined) {

            return;
        }

        this.sprite.draw(canvas, this.bitmap, this.pos.x - 12, this.pos.y - 16, this.flip);
    }

}
