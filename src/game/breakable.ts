import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
import { CollisionObject } from "./collisionobject.js";
import { Player } from "./player.js";
import { Projectile } from "./projectile.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";


const BASE_GRAVITY : number = 5.0;


export const enum BreakableType {

    Unknown = 0,
    Crate = 1
};


export class Breakable extends CollisionObject {


    private type : BreakableType = BreakableType.Unknown;


    constructor(x : number, y : number, type : BreakableType = BreakableType.Crate) {

        super(x, y, true);

        this.collisionBox = new Rectangle(0, -1, 16, 16);
        this.hitbox = this.collisionBox.clone();

        this.cameraCheckArea = new Vector(32, 32);

        this.friction.y = 0.15;
        this.target.y = BASE_GRAVITY;
    
        this.type = type;
    }


    public objectCollision(o : CollisionObject, event : ProgramEvent, 
        swapComparison : boolean = false,
        destroyOnHit : boolean = false) : void {

        const X_OFFSET : number = 1;
        const Y_OFFSET : number = 1;

        if (!this.isActive() || !o.isActive()) {

            return;
        }

        let x1 : number = this.pos.x - TILE_WIDTH/2;
        let y1 : number = this.pos.y - TILE_HEIGHT/2;
        let x2 : number = x1 + TILE_WIDTH;
        let y2 : number = y1 + TILE_HEIGHT;

        o.slopeCollision(x1 + X_OFFSET, y1, x2 - X_OFFSET*2, y1, 1, event);
        o.slopeCollision(x1 + X_OFFSET, y2, x2 - X_OFFSET*2, y2, -1, event);
        o.wallCollision(x1, y1 + Y_OFFSET, y2 - y1 - Y_OFFSET*2, 1, event);
        o.wallCollision(x2, y1 + Y_OFFSET, y2 - y1 - Y_OFFSET*2, -1, event);

        // Faster (to write, at least) than checking if any of the collision 
        // above returned true
        if (destroyOnHit && o.isDying()) {

            this.exist = false;
            // TODO: Spawn stuff
        }

        if (!swapComparison) {

            return;
        }

        const opos : Vector = o.getPosition();

        x1 = opos.x - TILE_WIDTH/2;
        y1 = opos.y - TILE_HEIGHT/2;
        x2 = x1 + TILE_WIDTH;
        y2 = y2 + TILE_HEIGHT;

        this.slopeCollision(x1 + X_OFFSET, y1, x2 - X_OFFSET*2, y1, 1, event);
        this.slopeCollision(x1 + X_OFFSET, y2, x2 - X_OFFSET*2, y2, -1, event);
        this.wallCollision(x1, y1 + Y_OFFSET, y2 - y1 - Y_OFFSET*2, 1, event);
        this.wallCollision(x2, y1 + Y_OFFSET, y2 - y1 - Y_OFFSET*2, -1, event);
    }


    public playerCollision(player : Player, event : ProgramEvent) : void {

        if (!this.isActive() || !player.isActive()) {

            return;
        }

        if (player.overlaySwordAttackArea(this)) {

            player.performDownAttackJump();
            this.exist = false;
        }
    }


    public projectileCollision(p : Projectile, event : ProgramEvent) : void {

        if (!this.isActive() || !p.isActive()) {

            return;
        }

        if (p.overlayObject(this)) {

            this.exist = false;
            if (p.destroyOnTouch()) {

                p.kill(event);
            }
            return;
        }

        this.objectCollision(p, event, false);
    }


    public draw(canvas: Canvas, assets : Assets | undefined, bmp : Bitmap | undefined) : void {
        
        if (!this.inCamera || !this.exist) {

            return;
        }

        canvas.drawBitmap(bmp, Flip.None, this.pos.x - 8, this.pos.y - 8, 0, 0, 16, 16);
    }
}
