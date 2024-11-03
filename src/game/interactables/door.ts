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


export class Door extends Interactable {


    private targetMap : string | undefined = undefined;


    private mapTransition : MapTransitionCallback;


    constructor(x : number, y : number, targetMap : string | undefined, 
        mapTransition : MapTransitionCallback) {

        super(x, y);

        this.hitbox.y = 12;
        this.hitbox.w = 16;

        this.cameraCheckArea = new Vector(32, 32);

        this.mapTransition = mapTransition;

        this.targetMap = targetMap;
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {

        event.audio.stopMusic();
        event.audio.playSample(event.assets.getSample("transition"), 0.70);

        player.setPosition(this.pos.x, this.pos.y, false);
        player.setPose(Pose.UseDoor);

        event.cloneCanvasToBufferTexture(true);
        event.transition.activate(true, TransitionType.Fade, 1.0/20.0, event,
            (event : ProgramEvent) : void => {

                this.mapTransition(this.targetMap ?? "coast", 0, Pose.EnterRoom, true, event);
            });
    }
}
