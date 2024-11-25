import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { TransitionType } from "../../core/transition.js";
import { Align, Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { RGBA } from "../../math/rgba.js";
import { Vector } from "../../math/vector.js";
import { TextBox } from "../../ui/textbox.js";
import { MapTransitionCallback } from "../maptransition.js";
import { Player, Pose } from "../player.js";
import { TILE_HEIGHT } from "../tilesize.js";
import { Interactable } from "./interactable.js";


const REQUIRED_ORB_COUNT : number = 8;
const LOCKED_DOOR_INDEX : number = 3;


// NOTE: This is basically the same class as "Door" with
// slightly different effects and such. This was writen before
// it occurred me that I could also use a *second* portal, but
// I'm also too lazy to merge this with door, so...


export class Portal extends Interactable {


    private id : number = 0;
    private targetMap : string | undefined = undefined;
    
    private locked : boolean = false;
    private requirementMet : boolean = false;
    private orbCount : number = 0;

    private mapTransition : MapTransitionCallback;

    private readonly dialogueBox : TextBox;


    constructor(x : number, y : number, bitmap : Bitmap | undefined, 
        mapTransition : MapTransitionCallback, dialogueBox : TextBox,
        id : number, targetMap : string | undefined,
        locked : boolean = false) {

        super(x, y - 24, bitmap);

        this.id = id;
        this.targetMap = targetMap;
        this.locked = locked;

        this.hitbox.y = 16;
        this.hitbox.w = 16;

        this.cameraCheckArea = new Vector(48, 64);

        this.sprite = new Sprite(32, 48);

        this.mapTransition = mapTransition;

        if (this.locked) {

            this.sprite.setFrame(0, 1);
        }

        this.dialogueBox = dialogueBox;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 4;
        const FLICKER_SPEED : number = 15;

        if (this.locked) {

            if (this.requirementMet) {

                this.sprite.animate(1, 1, 2, FLICKER_SPEED, event.tick);
            }
        }
        else {

            this.sprite.animate(0, 0, 7, ANIMATION_SPEED, event.tick);
        }
    }


    protected playerEvent(player : Player, event : ProgramEvent, initialEvent : boolean) : void {
        
        if (!this.locked) {

            return;
        }

        if (this.locked && player.stats.isDoorOpen(LOCKED_DOOR_INDEX)) {

            this.locked = false;
            return;
        }

        this.orbCount = player.stats.getOrbCount();
        this.requirementMet = this.orbCount >= REQUIRED_ORB_COUNT;
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {

        if (this.locked) {

            if (player.stats.getOrbCount() >= REQUIRED_ORB_COUNT) {

                this.dialogueBox.addText(event.localization?.getItem("open_huge_door") ?? ["null"]);

                player.stats.markDoorOpened(LOCKED_DOOR_INDEX);
                this.locked = false;

                event.audio.playSample(event.assets.getSample("choose"), 0.50);

                player.setPose(Pose.UseDoor);
                player.setPosition(this.pos.x, this.pos.y + 24, false);
            }
            else {

                this.dialogueBox.addText(event.localization?.getItem("locked_huge_door") ?? ["null"]);
                event.audio.playSample(event.assets.getSample("deny"), 0.70);
            }
            this.dialogueBox.activate();

            return;
        }

        event.audio.stopMusic();
        event.audio.playSample(event.assets.getSample("portal"), 0.70);

        player.setPosition(this.pos.x, this.pos.y + 24, false);
        player.setPose(Pose.UseDoor);

        event.cloneCanvasToBufferTexture(true);
        event.transition.activate(true, TransitionType.Waves, 1.0/120.0, event,
            (event : ProgramEvent) : void => {

                this.mapTransition(this.targetMap ?? "coast", this.id, Pose.EnterRoom, true, event);
                // event.cloneCanvasToBufferTexture(true);

                player.setPose(Pose.EnterRight);
            },
            new RGBA(255, 255, 255));
    }


    public postDraw(canvas : Canvas, assets : Assets) : void {
        
        if (!this.locked) {

            return;
        }

        const bmpFontOutlines : Bitmap | undefined = assets.getBitmap("font_outlines");
        const str : string = `${this.orbCount}/${REQUIRED_ORB_COUNT}`;

        canvas.drawText(bmpFontOutlines, str, this.pos.x, this.pos.y - 32, -8, 0, Align.Center);
    }
}
