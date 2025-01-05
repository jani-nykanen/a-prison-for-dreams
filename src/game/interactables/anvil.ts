import { Assets } from "../../core/assets.js";
import { ProgramEvent } from "../../core/event.js";
import { TransitionType } from "../../core/transition.js";
import { Bitmap, Canvas, Flip } from "../../gfx/interface.js";
import { TextBox } from "../../ui/textbox.js";
import { HintRenderer } from "../hintrenderer.js";
import { Item } from "../items.js";
import { Player, Pose, WaitType } from "../player.js";
import { Interactable } from "./interactable.js";


const ANVIL_HINT : number = 12;


export class Anvil extends Interactable {


    private shine : number = 0;
    private chunkPlaced : boolean = false;

    private swordCreated : boolean = false;
    private swordObtained : boolean = false;

    private readonly dialogueBox : TextBox;
    private readonly hints : HintRenderer;


    constructor(x : number, y : number, 
        dialogueBox : TextBox, hints : HintRenderer) {

        super(x, y, undefined);

        this.hitbox.w = 32;

        this.cameraCheckArea.x = 64;
        this.cameraCheckArea.y = 64;

        this.dialogueBox = dialogueBox;
        this.hints = hints;
    }


    private obtainSword(player : Player, event : ProgramEvent) : void {

        const HOLD_TIME : number = 120;

        const itemText : string[] = event.localization?.getItem(`item${Item.PowerfulSword}`) ?? ["null"];

        event.audio.pauseMusic();
        event.audio.playSample(event.assets.getSample("item"), 1.0);

        player.startWaiting(HOLD_TIME, WaitType.HoldingItem, Item.PowerfulSword, (event : ProgramEvent) : void => {

            this.dialogueBox.addText(itemText);
            this.dialogueBox.activate(false, null, (event : ProgramEvent) : void => {

                player.setCheckpointObject(this);

                player.stats.obtainItem(Item.PowerfulSword);
                player.stats.save();
                event.audio.resumeMusic();
            }); 

            const textKeyboard : string = event.localization?.getItem("hints")?.[ANVIL_HINT] ?? "null";
            const textGamepad : string | undefined = event.localization?.getItem("hints_gamepad")?.[ANVIL_HINT];

            this.hints.activate(this.pos, textKeyboard, textGamepad);
        });
    }


    protected updateEvent(event : ProgramEvent) : void {
        
        const SHINE_SPEED : number = Math.PI*2/120.0;

        if (this.swordObtained) {

            this.shine = 0.0;
            return;
        }
        this.shine = (this.shine + SHINE_SPEED*event.tick) % (Math.PI*2);
    }


    protected playerEvent(player : Player, event : ProgramEvent, initial : boolean) : void {
        
        if (initial) {

            this.swordObtained = player.stats.hasItem(Item.PowerfulSword);
            this.canBeInteracted = !this.swordObtained;
            return;
        }
        
        if (this.swordCreated && !this.swordObtained) {

            this.obtainSword(player, event);
            this.swordObtained = true;
        }
    }


    protected interactionEvent(player : Player, event : ProgramEvent) : void {
        
        if (!player.stats.hasItem(Item.ObsidianChunk)) {
            
            this.dialogueBox.addText(event.localization?.getItem("anvil_reject") ?? ["null"]);
            this.dialogueBox.activate();

            event.audio.playSample(event.assets.getSample("deny"), 0.70);
            return;
        }

        event.audio.playSample(event.assets.getSample("select"), 0.40);

        player.setPosition(this.pos.x, this.pos.y);
        player.setPose(Pose.Use);

        this.chunkPlaced = true;

        this.dialogueBox.addText(event.localization?.getItem("anvil_accept") ?? ["null"]);
        this.dialogueBox.activate(false, null, (event : ProgramEvent) : void => {

            event.audio.playSample(event.assets.getSample("hammer"), 0.60);

            event.transition.activate(true, TransitionType.Fade, 1.0/30.0, event, 
                (event : ProgramEvent) : void => {

                    this.chunkPlaced = false;
                    this.swordCreated = true;
                    this.canBeInteracted = false;
                });
        });
    }


    public draw(canvas : Canvas, assets : Assets) : void {
        
        if (!this.isActive()) {

            return;
        }

        const bmpAnvil : Bitmap | undefined = assets.getBitmap("anvil");

        const dx : number = this.pos.x - 18;
        const dy : number = this.pos.y - 9;

        // Anvil
        const totalShine : number = 255*(1.0 + 0.5*Math.abs(Math.sin(this.shine)));

        canvas.setColor(totalShine, totalShine, totalShine)
        canvas.drawBitmap(bmpAnvil, Flip.None, dx, dy, 0, 14, 32, 18);
        canvas.setColor();

        // Hammer
        canvas.drawBitmap(bmpAnvil, Flip.None, dx + 8, dy - 10, 0, 0, 32, 14);

        if (this.chunkPlaced) {

            const bmpItemIcons : Bitmap | undefined = assets.getBitmap("item_icons");
            canvas.drawBitmap(bmpItemIcons, Flip.None, dx + 10, dy - 14, 64, 16, 16, 16);
        }
    }

}
