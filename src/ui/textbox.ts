import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Bitmap, Canvas, Flip } from "../gfx/interface.js";
import { RGBA } from "../math/rgba.js";
import { drawUIBox } from "./box.js";


export class TextBox {


    private textBuffer : string[];
    private activeText : string | undefined = undefined;

    private charPos : number = 0;
    private charWait : number = 0;
    private finished : boolean = false;

    private active : boolean = false;

    private width : number = 0;
    private height : number = 0;
    private fixedSize : boolean = false;

    private waitWave : number = 0;

    private portraitID : number | null = null;

    private finishEvent : ((event : ProgramEvent) => void) | undefined = undefined;
    

    constructor(fixedSize : boolean = false, fixedWidth : number = 0, fixedHeight : number = 0) {   

        this.textBuffer = new Array<string> ();

        this.fixedSize = fixedSize;
        if (fixedSize) {

            this.width = fixedWidth;
            this.height = fixedHeight ;
        }
    }


    private computeDimensions() : void {

        if (this.activeText === undefined)
            return;

        const lines : string[] = this.activeText.split("\n");

        this.width = Math.max(...lines.map(s => s.length));
        this.height = lines.length;
    }


    private drawIcon(canvas : Canvas, x : number, y : number) : void {

        const WIDTH : number = 8;
        const HEIGHT : number = 8;

        const AMPLITUDE : number = 1;

        const dx : number = x; 
        const dy : number = y + Math.round(Math.sin(this.waitWave)*AMPLITUDE);

        canvas.setColor(0, 0, 0);
        canvas.fillRect(dx, dy, WIDTH, HEIGHT);
        canvas.setColor(255, 255, 73);
        canvas.fillRect(dx + 1, dy + 1, WIDTH - 2, HEIGHT - 2);
        canvas.setColor();
    }


    public addText(text : string[], parameters? : string[][]) : void {

        if (parameters === undefined) {

            this.textBuffer.push(...text);
            return;
        }

        for (let i : number = 0; i < text.length; ++ i) {

            let baseMessage : string = text[i];
            if (parameters?.[i] !== undefined) {

                for (let j : number = 0; j < parameters.length; ++ j) {

                    baseMessage = baseMessage.replace(`%${j + 1}`, parameters[i][j]);
                }
            }
            this.textBuffer.push(baseMessage);
        } 
    }


    public activate(instant : boolean = false, portraitID : number | null = null,
        finishEvent : ((event : ProgramEvent) => void) | undefined = undefined) : void {

        this.portraitID = portraitID;

        if (this.textBuffer.length == 0) {

            return;
        }

        this.activeText = this.textBuffer.shift() ?? "";

        if (!this.fixedSize) {

            this.computeDimensions();
        }

        this.charPos = 0;
        this.charWait = 0;
        this.finished = false;

        this.active = true;

        // TODO: Works only if there is only one message
        // in the buffer
        if (instant) {

            this.finished = true;
            this.charPos = this.activeText?.length ?? 0;
        }

        this.finishEvent = finishEvent;
    }


    public update(event : ProgramEvent) : void {

        const WAIT_WAVE_SPEED : number = Math.PI*2/60;
        const CHAR_WAIT_TIME : number = 3;

        if (!this.active || this.activeText === undefined)
            return;

        if (!this.finished) {

            if (event.input.isAnyPressed()) {
                
                // event.audio.playSample(event.assets.getSample("choose"), 0.60);

                this.charPos = this.activeText.length;
                this.finished = true;
                return;
            }

            while ((this.charWait += event.tick) >= CHAR_WAIT_TIME) {

                ++ this.charPos;
                if (this.charPos == this.activeText.length) {

                    this.finished = true;
                    break;
                }

                const c : string = this.activeText?.charAt(this.charPos);
                if (c != "\n" && c != " ") {

                    this.charWait -= CHAR_WAIT_TIME;
                }
            }
            return;
        }

        if (this.finished) {

            this.waitWave = (this.waitWave + WAIT_WAVE_SPEED*event.tick) % (Math.PI*2);

            if (event.input.isAnyPressed()) {

                event.audio.playSample(event.assets.getSample("choose"), 0.50);

                this.activeText = this.textBuffer.shift();
                if (this.activeText === undefined) {

                    this.finishEvent?.(event);
                    this.active = false;
                    return;
                }

                if (!this.fixedSize) {

                    this.computeDimensions();
                }

                this.charPos = 0;
                this.charWait = 0;

                this.finished = false;
            }
        }
    }


    public draw(canvas : Canvas, assets : Assets, 
        x : number = 0, y : number = 0, yoff : number = 2, 
        drawBox : boolean = true, drawIcon : boolean = true,
        boxColors : RGBA[] | undefined = undefined,
        drawShadow : boolean = true, shadowAlpha : number = 0.25, 
        shadowOffset : number = 2) : void {

        const BOX_OFFSET : number = 2;
        const SIDE_OFFSET : number = 2;

        if (!this.active) {
            
            return;
        }

        const font : Bitmap | undefined  = assets.getBitmap("font");
        const bmpPortraits : Bitmap | undefined = assets.getBitmap("portraits");

        const charDim : number = (font?.width ?? 128)/16;

        const w : number = (this.width*charDim + SIDE_OFFSET*2);
        const h : number = this.height*(charDim + yoff) + SIDE_OFFSET*2;

        let dx : number = x + canvas.width/2 - w/2;
        const dy : number = y + canvas.height/2 - h/2; 

        if (drawBox) {

            drawUIBox(canvas, 
                dx - BOX_OFFSET, dy - BOX_OFFSET, 
                w + BOX_OFFSET*2, h + BOX_OFFSET*2,
                boxColors, drawShadow, shadowAlpha, shadowOffset);
        }

        // Store this before modifying dx further, since the icon
        // should be drawn last
        const iconPosX : number = dx + w - 3; 

        const ph : number = bmpPortraits?.height ?? 0;
        if (this.portraitID !== null) {

            canvas.setColor(0, 0, 0, 0.5);
            canvas.fillRect(dx + 4, dy + h/2 - ph/2, 48, 48);
            canvas.setColor();

            canvas.drawBitmap(bmpPortraits, Flip.None, 
                dx + 4, dy + h/2 - ph/2, this.portraitID*ph, 0, ph, ph);
        }

        const textAreaShift : number = this.portraitID === null ? 0 : ph + 8;
        dx += textAreaShift;

        const str : string = this.activeText?.substring(0, this.charPos) ?? "";
        canvas.drawText(font, str, dx + SIDE_OFFSET, dy + SIDE_OFFSET, 0, yoff);

        if (this.finished && drawIcon) {

            this.drawIcon(canvas, iconPosX, dy + h - 3);
        }
    }


    public isActive = () : boolean => this.active;


    public deactivate() : void {

        this.active = false;
    }


    public forceChangeText(newText : string) : void {

        this.activeText = newText;
        this.finished = true;
        this.charPos = this.activeText.length;
    }


    public clear() : void {

        this.textBuffer = new Array<string> ();
    }


    public isFinished = () : boolean => this.finished;


    public getWidth = () : number => this.width;
    public getHeight = () : number => this.height;

}
