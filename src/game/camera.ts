import { ProgramEvent } from "../core/event.js";
import { Canvas, TransformTarget } from "../gfx/interface.js";
import { Vector } from "../math/vector.js";
import { updateSpeedAxis } from "./utility.js";


export class Camera {


    private pos : Vector;
    private targetPos : Vector;
    private size : Vector;
    private corner : Vector;


    public get width() : number {

        return this.size.x;
    }
    public get height() : number {

        return this.size.y;
    }


    constructor(x : number = 0.0, y : number = 0.0, event : ProgramEvent) {

        this.pos = new Vector(x, y);
        this.targetPos = this.pos.clone();

        this.size = new Vector(event.screenWidth, event.screenHeight);
        this.corner = new Vector(x - this.size.x/2, y - this.size.y/2);
    }


    public computeCorner() : void {

        this.corner.x = this.pos.x - this.size.x/2;
        this.corner.y = this.pos.y - this.size.y/2;
    }


    public update(event : ProgramEvent) : void {

        const H_FACTOR : number = 8;
        const V_FACTOR : number = 6;
        const FLICKERING_REDUCTIONS_THRESHOLD : number = 2;

        this.size.x = event.screenWidth;
        this.size.y = event.screenHeight;

        this.computeCorner();

        // When near the target position, the camera might start to "flicker"
        // back and forth, so to avoid this we make the camera jump to the
        // target position if close enough.
        if (Math.abs(this.pos.x - this.targetPos.x) <= FLICKERING_REDUCTIONS_THRESHOLD) {

            this.targetPos.x = this.pos.x;
        }
        if (Math.abs(this.pos.y - this.targetPos.y) <= FLICKERING_REDUCTIONS_THRESHOLD) {

            this.targetPos.y = this.pos.y;
        }

        this.pos.x = updateSpeedAxis(this.pos.x, 
            this.targetPos.x, 
            (Math.abs(this.pos.x - this.targetPos.x)/H_FACTOR)*event.tick);
        this.pos.y = updateSpeedAxis(this.pos.y, 
            this.targetPos.y, 
            (Math.abs(this.pos.y - this.targetPos.y)/V_FACTOR)*event.tick);
    }


    public limit(left : number, right : number, top : number, bottom : number) : void {

        if (right - left <= this.size.x) {

            this.pos.x = 0; // Not sure what this should really be
            this.corner.x = -(this.size.x - (right - left))/2;
        }
        else {

            if (this.corner.x + this.size.x > right) {

                this.corner.x = right - this.size.x;
                this.pos.x = this.corner.x + this.size.x/2;
            }

            if (this.corner.x < left) {

                this.corner.x = left;
                this.pos.x = this.corner.x + this.size.x/2;
            }
        }
        
        if (this.corner.y + this.size.y > bottom) {

            this.corner.y = bottom - this.size.y;
            this.pos.y = this.corner.y + this.size.y/2;
        }

        if (this.corner.y < top) {

            this.corner.y = top;
            this.pos.y = this.corner.y + this.size.y/2;
        }
    }


    public apply(canvas : Canvas) : void {

        //canvas.transform.setTarget(TransformTarget.Model); // TODO: Why not "Camera"...?
        //canvas.transform.translate(Math.floor(-this.corner.x), Math.floor(-this.corner.y));
        //canvas.transform.apply();

        // Using "moveTo" instead of modifying the transformation matrix
        // reduces "flickering" of the game objects since it is easier this
        // way to "floor" the rendering coordinates.
        canvas.moveTo(-this.corner.x, -this.corner.y);
    }


    public followPoint(p : Vector) : void {

        const HORIZONTAL_THRESHOLD : number = 16;
        const VERTICAL_THRESHOLD : number = 16;

        const X_OFFSET : number = 0;
        const Y_OFFSET : number = 0;

        const target : Vector = new Vector(p.x + X_OFFSET, p.y + Y_OFFSET);

        if (Math.abs(target.x - this.pos.x) > HORIZONTAL_THRESHOLD) {

            this.targetPos.x = target.x - Math.sign(target.x - this.pos.x)*HORIZONTAL_THRESHOLD;
        }

        if (Math.abs(target.y - this.pos.y) > VERTICAL_THRESHOLD) {

            this.targetPos.y = target.y - Math.sign(target.y - this.pos.y)*VERTICAL_THRESHOLD;
        }
    }


    public forceCenter(p : Vector) : void {

        this.pos = p.clone();
        this.targetPos = this.pos.clone();

        this.computeCorner();
    }


    public getPosition = () : Vector => this.pos.clone();
    public getCorner = () : Vector => this.corner.clone();


    public isInsideVisibleArea(center : Vector, size : Vector) : boolean {

        const left : number = center.x - size.x/2;
        const top : number = center.y - size.y/2;

        return left + size.x >= this.corner.x &&
               top + size.y >= this.corner.y &&
               left <= this.corner.x + this.width &&
               top <= this.corner.y + this.height;
    }


    public computeRelativePositionForPoint(p : Vector) : Vector {

        return new Vector(
            p.x - this.corner.x,
            p.y - this.corner.y);
    }
}
