import { ProgramEvent } from "../core/event.js";
import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
import { GameObject } from "./gameobject.js";


export class CollisionObject extends GameObject {


    protected collisionBox : Rectangle;

    protected takeCollisions : boolean = true;
    protected checkVerticalSlope : boolean = false;
    protected ignoreBottomLayer : boolean = false;
    // This flag is needed for projectiles.
    protected ignoreEvenSlopes : boolean = false; 

    protected steepnessFactor : number = 0.0;

    protected bounceFactor : Vector;
    protected touchSurface : boolean = false;

    protected dir : number = 0;


    constructor(x : number = 0, y : number = 0, exist : boolean = false) {

        super(x, y, exist);

        this.collisionBox = new Rectangle(0, 0, 16, 16);
        this.bounceFactor = new Vector(0.0, 0.0);
    }


    private verticalSlopeCollision(
        x1 : number, y1 : number, x2 : number, y2 : number, 
        direction : -1 | 1, event : ProgramEvent) : boolean {

        const SAFE_MARGIN_NEAR : number = 1.0;
        const SAFE_MARGIN_FAR : number = 4.0;
        const TOO_CLOSE : number = 0.01;

        if (Math.abs(y1 - y2) < TOO_CLOSE) {

            return false;
        }

        // To make the collision work properly we need to assume that y1 is the upper point.
        if (y1 > y2) {

            return this.verticalSlopeCollision(x2, y2, x1, y1, direction, event);
        }

        const px : number = this.pos.x + this.collisionBox.x;
        const py : number = this.pos.y + this.collisionBox.y + this.collisionBox.h/2*direction;
        const oldX : number = this.oldPos.x + this.collisionBox.x + this.collisionBox.w/2*direction;

        // Check if the player is in the horizontal range and the direction of the speed is correct.
        if (py - this.collisionBox.h/2 > y2 || 
            py + this.collisionBox.h/2 < y1 || 
            this.speed.x*direction < 0) {

            return false;
        }

        // Find the collision y coordinate.
        const steepness : number = (x2 - x1)/(y2 - y1);
        const xshift : number = x1 - steepness*y1;
        const x0 : number = this.pos.y*steepness + xshift;

        // Check if in the collision range.
        if ((direction > 0 && 
            px >= x0 - (SAFE_MARGIN_NEAR)*event.tick &&
            oldX <= x0 + (SAFE_MARGIN_FAR + Math.abs(this.speed.x))*event.tick) ||
            (direction < 0 && 
            px <= x0 + (SAFE_MARGIN_NEAR)*event.tick &&
            oldX >= x0 - (SAFE_MARGIN_FAR + Math.abs(this.speed.x))*event.tick )) {

            this.pos.x = x0 - this.collisionBox.x - this.collisionBox.w/2*direction;
            this.speed.x *= -this.bounceFactor.x;

            this.slopeCollisionEvent?.(direction, event);

            return true;
        }
        return false;
    }


    protected slopeCollisionEvent?(direction : -1 | 1, event : ProgramEvent) : void;
    protected wallCollisionEvent?(direction : -1 | 1, event : ProgramEvent) : void;


    protected overlayCollisionArea(x : number, y : number, w : number, h : number) : boolean {

        return this.pos.x + this.collisionBox.x + this.collisionBox.w/2 >= x &&
               this.pos.x + this.collisionBox.x - this.collisionBox.w/2 <= x + w && 
               this.pos.y + this.collisionBox.y + this.collisionBox.h/2 >= y &&
               this.pos.y + this.collisionBox.y - this.collisionBox.h/2 <= y + h;
    }


    protected computeSlopeSpeedFactor() : number {

        const SLOWDOWN_FACTOR : number = 0.10;
        const SPEEDUP_FACTOR : number = 0.20;

        const baseFactor : number = this.touchSurface ? -this.dir*this.steepnessFactor : 0.0;
        const speedFactor : number = baseFactor < 0 ? SLOWDOWN_FACTOR : SPEEDUP_FACTOR;

        return 1.0 - baseFactor*speedFactor;
    }

    
    public hurtCollision?(x : number, y : number, w : number, h : number, 
        event : ProgramEvent, direction? : -1 | 0 | 1, damage? : number) : boolean;
    public waterCollision?(x : number, y : number, w : number, h : number,
        event : ProgramEvent, surface? : boolean) : boolean;


    public slopeCollision(
        x1 : number, y1 : number, x2 : number, y2 : number, 
        direction : -1 | 1, event : ProgramEvent,
        leftMargin : number = 1, rightMargin : number = 1,
        safeMarginNear : number = 1.0, safeMarginFar : number = 4.0) : boolean {

        const TOO_CLOSE : number = 0.01;
        const MIN_SPEED : number = 0.01;

        if (!this.takeCollisions || !this.isActive()) {

            return false;
        }

        // Needed for bullets etc.
        if (this.checkVerticalSlope && Math.abs(y1 - y2) > TOO_CLOSE) {

            return this.verticalSlopeCollision(x1, y1, x2, y2, y2 > y1 ? -1 : 1, event);
        }

        if (Math.abs(x1 - x2) < TOO_CLOSE) {

            return false;
        }

        // A workaround to get collisions work properly with projectiles without
        // having to write proper collision detection...
        if (x1 > x2) {

            return this.slopeCollision(x2, y2, x1, y1, direction, event, leftMargin, rightMargin);
        }

        const px : number = this.pos.x + this.collisionBox.x;
        const py : number = this.pos.y + this.collisionBox.y + this.collisionBox.h/2*direction;
        const oldY : number = this.oldPos.y + this.collisionBox.y + this.collisionBox.h/2*direction;

        // Check if the player is in the horizontal range and the direction of the speed is correct.
        if (px - this.collisionBox.w/2*rightMargin > x2 || 
            px + this.collisionBox.w/2*leftMargin < x1 || 
            this.speed.y*direction <= -MIN_SPEED*direction) {

            return false;
        }

        // Find the collision y coordinate.
        const steepness : number = (y2 - y1)/(x2 - x1);
        const yshift : number = y1 - steepness*x1;
        const y0 : number = this.pos.x*steepness + yshift;

        const totalSpeed : number = this.speed.length;

        // Check if in the collision range.
        if ((direction > 0 && 
            py >= y0 - safeMarginNear*event.tick &&
            oldY <= y0 + (safeMarginFar + totalSpeed)*event.tick) ||
            (direction < 0 && 
            py <= y0 + safeMarginNear*event.tick &&
            oldY >= y0 - (safeMarginFar + totalSpeed)*event.tick )) {

            this.pos.y = y0 - this.collisionBox.y - this.collisionBox.h/2*direction;
            this.speed.y *= -this.bounceFactor.y;

            this.steepnessFactor = steepness;
            this.touchSurface = true;
                
            this.slopeCollisionEvent?.(direction, event);

            return true;
        }
        return false;
    }


    public wallCollision(x : number, y : number, 
        height : number, direction : -1 | 1, event : ProgramEvent) : boolean {
            
        const SAFE_MARGIN_NEAR : number = 1.0;
        const SAFE_MARGIN_FAR : number = 4.0;
    
        if (!this.takeCollisions || !this.isActive()) {
    
            return false;
        }
    
        const px : number = this.pos.x + this.collisionBox.x + this.collisionBox.w/2*direction;
        const py : number = this.pos.y + this.collisionBox.y - this.collisionBox.h/2;
        const oldX : number = this.oldPos.x + this.collisionBox.x + this.collisionBox.w/2*direction;
        
        // Check if in vertical range.
        if (py > y + height || py + this.collisionBox.h < y || this.speed.x*direction < 0) {
    
            return false;
        }
        
        // Check if in the collision area.
        if ((direction > 0 && 
            px >= x - (SAFE_MARGIN_NEAR)*event.tick &&
            oldX <= x + (SAFE_MARGIN_FAR + Math.abs(this.speed.x))*event.tick) ||
            (direction < 0 && 
            px <= x + (SAFE_MARGIN_NEAR)*event.tick &&
            oldX >= x - (SAFE_MARGIN_FAR + Math.abs(this.speed.x))*event.tick )) {
    
            this.pos.x = x - this.collisionBox.x - this.collisionBox.w/2*direction;
            this.speed.x *= -this.bounceFactor.x;
                
            this.wallCollisionEvent?.(direction, event);
    
            return true;
        }
        return false;
    }


    public getCollisionBox = () : Rectangle => this.collisionBox.clone();
    public doesTakeCollisions = () : boolean => this.takeCollisions;
    public doesIgnoreBottomLayer = () : boolean => this.ignoreBottomLayer;
    public doesIgnoreEvenSlopes = () : boolean => this.ignoreEvenSlopes;
    public doesTouchSurface = () : boolean => this.touchSurface;
}
