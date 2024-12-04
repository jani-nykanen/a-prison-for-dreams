import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { TransitionType } from "../../core/transition.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { RGBA } from "../../math/rgba.js";
import { Vector } from "../../math/vector.js";
import { TextBox } from "../../ui/textbox.js";
import { Item } from "../items.js";
import { MapTransitionCallback } from "../maptransition.js";
import { Player, Pose } from "../player.js";
import { TILE_HEIGHT } from "../tilesize.js";
import { Interactable } from "./interactable.js";


export class Door extends Interactable {


    private targetMap : string | undefined = undefined;
    private id : number = 0;
    private requiredKey : number | undefined = undefined;
    private opened : boolean = true;
    private requireMinibossDefeat : boolean = false;


    private mapTransition : MapTransitionCallback;
    private readonly dialogueBox : TextBox;


    constructor(x : number, y : number, id : number,
        targetMap : string | undefined, 
        mapTransition : MapTransitionCallback,
        dialogueBox : TextBox,
        requiredKey : number | undefined = undefined,
        requireMinibossDefeat : boolean = false,
        bmp : Bitmap | undefined = undefined) {

        super(x, y, bmp);

        this.id = id;
        this.requiredKey = requiredKey;
        this.opened = requiredKey === undefined;

        // this.hitbox.y = 12;
        this.hitbox.w = 8;

        this.cameraCheckArea = new Vector(32, 32);

        this.dialogueBox = dialogueBox;
        this.mapTransition = mapTransition;

        this.targetMap = targetMap;

        this.requireMinibossDefeat = requireMinibossDefeat;
    }


    protected playerEvent(player : Player, event : ProgramEvent, initialEvent : boolean) : void {
        
        if (!initialEvent) {

            return;
        }

        if (this.requireMinibossDefeat) {

            this.opened = !player.stats.hasDefeatedMiniboss();
            if (!this.opened) {

                this.canBeInteracted = false;
            }
        }
        else if (this.requiredKey !== undefined) {

            this.opened = player.stats.isDoorOpen(this.requiredKey);
        }

        if (initialEvent && this.opened) {

            this.sprite.setFrame(0, 0);
        }
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {

        if (this.requiredKey !== undefined && !this.opened) {

            const colors : string[] | undefined = event.localization?.getItem("door_colors");
            
            if (player.stats.hasItem(Item.RedKey + this.requiredKey)) {

                this.dialogueBox.addText(
                    event.localization?.getItem("open_door") ?? ["null"], 
                    [[colors[this.requiredKey] ?? "null"]]);

                player.stats.markDoorOpened(this.requiredKey);
                this.opened = true;

                event.audio.playSample(event.assets.getSample("choose"), 0.50);

                player.setPose(Pose.UseDoor);
                player.setPosition(this.pos.x, this.pos.y, false);
            }
            else {

                this.dialogueBox.addText(
                    event.localization?.getItem("locked") ?? ["null"], 
                    [[colors[this.requiredKey] ?? "null"]]);

                event.audio.playSample(event.assets.getSample("deny"), 0.70);
            }
            this.dialogueBox.activate();
            return;
        }

        event.audio.stopMusic();
        event.audio.playSample(event.assets.getSample("transition"), 0.70);

        player.setPosition(this.pos.x, this.pos.y, false);
        player.setPose(Pose.UseDoor);

        event.cloneCanvasToBufferTexture(true);
        event.transition.activate(true, TransitionType.Fade, 1.0/20.0, event,
            (event : ProgramEvent) : void => {

                this.mapTransition(this.targetMap ?? "coast", this.id, Pose.EnterRoom, true, event);
            });
    }


    public draw(canvas : Canvas, assets : Assets) : void {
        
        if (!this.isActive() || this.opened || this.bitmap === undefined) {

            return;
        }

        let id : number = this.requiredKey ?? 0;
        if (this.requireMinibossDefeat) {

            id = 3;
        }

        canvas.drawBitmap(this.bitmap, Flip.None, this.pos.x - 8, this.pos.y - 24, id*16, 0, 16, 32);
    }
}
