import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { Sprite } from "../../gfx/sprite.js";
import { ConfirmationBox } from "../../ui/confirmationbox.js";
import { TextBox } from "../../ui/textbox.js";
import { Camera } from "../camera.js";
import { HintRenderer } from "../hintrenderer.js";
import { Player, WaitType } from "../player.js";
import { Interactable } from "./interactable.js";


const DEATH_TIME : number = 60;


export class FinalBossTrigger extends Interactable {


    private textbox : TextBox;
    private confirmationBox : ConfirmationBox;
    private wave : number = 0;

    private deathTimer : number = 0;

    private readonly triggerEvent : () => void;


    constructor(x : number, y : number, 
        textbox : TextBox, confirmationBox : ConfirmationBox,
        triggerEvent : () => void) {

        super(x, y, undefined);

        this.hitbox.w = 32;

        this.cameraCheckArea.x = 64;
        this.cameraCheckArea.y = 64;

        this.textbox = textbox;
        this.confirmationBox = confirmationBox;

        this.triggerEvent = triggerEvent;

        this.sprite = new Sprite(32, 32);
    }


    private startHug(player : Player, event : ProgramEvent) : void {

        player.setPosition(this.pos.x, this.pos.y);

        // TODO: This ain't no hugging
        // (eh, close enough. In practice there is barely
        //  any difference anyway)
        event.audio.playSample(event.assets.getSample("lick"), 0.60);

        this.confirmationBox.deactivate();
        player.startWaiting(90, WaitType.Hugging, undefined, (event : ProgramEvent) : void => {
            
            this.dying = true;
            this.triggerEvent();
        });
    }


    protected die(event : ProgramEvent) : boolean {

        this.deathTimer += event.tick;

        return this.deathTimer >= DEATH_TIME;
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const WAVE_SPEED : number = Math.PI*2/90.0;
        const FRAME_TIME : number = 6;

        this.wave = (this.wave + WAVE_SPEED*event.tick) % (Math.PI*2);
        this.sprite.animate(0, 0, 3, FRAME_TIME, event.tick);
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        // ...
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
        if (player.stats.hasTemporaryFlag("hugged")) {

            this.startHug(player, event);
            return;
        }

        event.audio.playSample(event.assets.getSample("select"), 0.40);

        this.textbox.addText(event.localization?.getItem("spirit_prelude") ?? ["null"]);
        this.textbox.activate(false, null, (event : ProgramEvent) : void => {

            player.setCheckpointObject(this);

            this.confirmationBox.activate(1, undefined, 
                (event : ProgramEvent) : void => {
                    
                    player.stats.setTemporaryFlag("hugged");
                    this.startHug(player, event);
                }
            );
        });
    }


    public draw(canvas : Canvas, assets : Assets) : void {
        
        const AMPLITUDE : number = 2;
        const YOFF : number = 26;

        if (!this.exist || !this.inCamera) {

            return;
        }

        const bmpSpirit : Bitmap | undefined = assets.getBitmap("spirit");

        const dx : number = this.pos.x - 16;
        const dy : number = this.pos.y - YOFF + Math.round(Math.sin(this.wave)*AMPLITUDE);

        if (this.dying) {
            
            const t : number = this.deathTimer/DEATH_TIME;
            canvas.setColor(255, 255, 255, 1.0 - t);
            canvas.drawFunnilyAppearingBitmap(bmpSpirit, Flip.None, 
                dx, dy, 0, 0, 32, 32, t, 48, 4, 4);
            canvas.setColor();
            return;
        }

        // Body
        this.sprite.draw(canvas, bmpSpirit, dx, dy);
        // Eyes
        canvas.drawBitmap(bmpSpirit, Flip.None, dx, dy, 128, 0, 32, 32);
    }

}
