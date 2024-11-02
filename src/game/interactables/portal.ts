import { ProgramEvent } from "../../core/event.js";
import { TransitionType } from "../../core/transition.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { RGBA } from "../../math/rgba.js";
import { Vector } from "../../math/vector.js";
import { TextBox } from "../../ui/textbox.js";
import { MapTransitionCallback } from "../maptransition.js";
import { Player, Pose } from "../player.js";
import { TILE_HEIGHT } from "../tilesize.js";
import { Interactable } from "./interactable.js";


export class Portal extends Interactable {


    private mapTransition : MapTransitionCallback;


    constructor(x : number, y : number, bitmap : Bitmap | undefined, mapTransition : MapTransitionCallback) {

        super(x, y - 24, bitmap);

        this.hitbox.y = 16;
        this.hitbox.w = 16;

        this.cameraCheckArea = new Vector(48, 64);

        this.sprite = new Sprite(32, 48);

        this.mapTransition = mapTransition;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const ANIMATION_SPEED : number = 4;

        this.sprite.animate(0, 0, 7, ANIMATION_SPEED, event.tick);
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {

        event.audio.stopMusic();
        event.audio.playSample(event.assets.getSample("portal"), 0.70);

        player.setPosition(this.pos.x, this.pos.y + 24, false);
        player.setPose(Pose.UseDoor);

        event.cloneCanvasToBufferTexture(true);
        event.transition.activate(true, TransitionType.Waves, 1.0/120.0, event,
            (event : ProgramEvent) : void => {

                this.mapTransition("coast", 0, Pose.EnterRoom, true, event);
                // event.cloneCanvasToBufferTexture(true);

                player.setPose(Pose.EnterRight);
            },
            new RGBA(255, 255, 255));
    }
}
