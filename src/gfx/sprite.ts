import { Bitmap } from "./interface.js";
import { Canvas, Flip } from "./interface.js";


export class Sprite {


    private column : number = 0;
    private row : number = 0;
    private timer : number = 0.0;

    private frameWidth : number;
    private frameHeight : number;


    public get width() : number {

        return this.frameWidth;
    }
    public get height() : number {

        return this.frameHeight;
    }


    constructor(width : number = 0, height : number = 0) {

        this.frameWidth = width;
        this.frameHeight = height;
    }


    private nextFrame(dir : number, startFrame : number, endFrame : number) : void {

        this.column += dir;

        const min = Math.min(startFrame, endFrame);
        const max = Math.max(startFrame, endFrame);

        if (this.column < min)
            this.column = max;
        else if (this.column > max)
            this.column = min;
    } 

    
    public animate(row : number,
        startFrame : number, endFrame : number, 
        frameTime : number, step : number) : void {

        // To avoid semi-infinite loops
        const MAX_FRAME_SKIP : number = 5;

        const dir : number = Math.sign(endFrame - startFrame);

        // Non-positive frame speed means that the frame changes
        // infinitely fast, thus we do not animate at all
        if (frameTime <= 0) {

            return;
        }

        if (row != this.row) {
            
            this.column = startFrame;
            this.timer = 0;

            this.row = row;
        }

        this.timer += step;
 
        let frameSkipCount : number = 0;
        while (this.timer >= frameTime) {

            this.timer -= frameTime;
            this.nextFrame(dir, startFrame, endFrame);

            ++ frameSkipCount;
            if (frameSkipCount >= MAX_FRAME_SKIP) {

                this.timer = 0;
                break;
            }
        }
        
    }


    public draw(canvas : Canvas, bmp : Bitmap | undefined, 
        dx : number, dy : number, flip : Flip = Flip.None,
        scalex : number = this.width, scaley : number = this.height) : void {

        canvas.drawBitmap(bmp, flip, 
            dx, dy, 
            this.column*this.width, this.row*this.height, 
            this.width, this.height, scalex, scaley);
    }


    public setFrame(column : number, row : number, preserveTimer : boolean = false) : void {

        this.column = column;
        this.row = row;

        if (!preserveTimer) {
            
            this.timer = 0.0;
        }
    }


    public setDimensions(newWidth : number, newHeight : number) : void {

        this.frameWidth = newWidth;
        this.frameHeight = newHeight;
    }


    public getColumn = () : number => this.column;
    public getRow = () : number => this.row;
    public getFrameTime = () : number => this.timer;
}
