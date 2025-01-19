import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { TransitionType } from "../core/transition.js";
import { Align, Bitmap, Canvas, Flip } from "../gfx/interface.js";


const ITEM_OFFSET : number = 32;
const YOFF : number = 12;
const HEADER_EXTRA_OFF : number = 4;

const MUSIC_VOLUME : number = 0.50;


export class Credits implements Scene {


    private phase : number = 0;

    private headers : string[];
    private creators : string[][];

    private pos : number = 0;
    private totalHeight : number = 0;

    private strTheEnd : string = "";


    constructor(event : ProgramEvent) {

        this.creators = new Array<string[]> ();
        this.headers = event.localization?.getItem("credits_titles") ?? [];
        
        const creatorData : string[] = event.localization?.getItem("credits_names") ?? [];
        for (const c of creatorData) {

            this.creators.push(c.split("\n"));
        }

        this.strTheEnd = event.localization?.getItem("the_end")?.[0] ?? "null";

        this.computeTotalHeight();
    }


    private computeTotalHeight() : void {

        this.totalHeight = YOFF;
        for (let i : number = 0; i < this.headers.length; ++ i) {

            this.totalHeight += YOFF + HEADER_EXTRA_OFF;
            this.totalHeight += (this.creators[i].length - 1)*YOFF;

            if (i != this.headers.length - 1) {
                
                this.totalHeight += ITEM_OFFSET;
            }
        }
    }


    private drawSecondPhase(canvas : Canvas, assets : Assets) {

        const bmpLogo : Bitmap | undefined = assets.getBitmap("logo");
        const bmpFont : Bitmap | undefined = assets.getBitmap("font");

        if (bmpLogo !== undefined) {

            canvas.drawBitmap(bmpLogo, Flip.None,
                canvas.width/2 - bmpLogo.width/2,
                canvas.height/2 - bmpLogo.height/2 - 16);

            canvas.drawText(bmpFont, this.strTheEnd, 
                canvas.width/2, canvas.height/2 + bmpLogo.height/2 - 8, 
                -1, 0, Align.Center);
        }
    }


    public init(param : SceneParameter, event : ProgramEvent) : void {

        event.transition.deactivate();
        event.audio.fadeInMusic(event.assets.getSample("titlescreen"), MUSIC_VOLUME, 1000.0);

        this.phase = 0;
    }


    public update(event : ProgramEvent): void {

        const APPEAR_SPEED : number = 0.5;

        if (event.transition.isActive()) {

            return;
        }

        if (this.phase == 1) {

            if (event.input.isAnyPressed()) {

                event.audio.stopMusic();

                event.audio.playSample(event.assets.getSample("select"), 0.40);
                event.transition.activate(true, TransitionType.Fade, 1.0/60.0,
                    event, (event : ProgramEvent) : void => {

                        event.scenes.changeScene("title", event);
                        event.transition.activate(false, TransitionType.Circle, 1.0/30.0, event);
                    });
            }
            return;
        }

        this.pos += APPEAR_SPEED*event.tick;
        if (this.pos >= this.totalHeight + event.screenHeight) {

            event.transition.activate(false, TransitionType.Fade, 1.0/30.0, event);
            this.phase = 1;
        }
    }


    public redraw(canvas : Canvas, assets : Assets) : void {

        const bmpFont : Bitmap | undefined = assets.getBitmap("font");

        canvas.clear(0, 0, 0);

        if (this.phase == 1) {

            // TODO: Also put the first phase inside a function.
            this.drawSecondPhase(canvas, assets);
            return;
        }

        const top : number = canvas.height - this.pos;

        let dy : number = top;
        for (let i : number = 0; i < this.headers.length; ++ i) {

            const creators : string[] = this.creators[i];
            const header : string = this.headers[i];

            // Title
            canvas.setColor(255, 255, 109);
            canvas.drawText(bmpFont, header, canvas.width/2, dy, -1, 0, Align.Center);

            dy += HEADER_EXTRA_OFF;

            // Names
            canvas.setColor();
            for (let j : number = 0; j < creators.length; ++ j) {

                dy += YOFF;
                canvas.drawText(bmpFont, creators[j], canvas.width/2, dy, -1, 0, Align.Center);
            }
            dy += ITEM_OFFSET;
        }
    }


    public dispose() : SceneParameter {
        
        return undefined;
    }
}
