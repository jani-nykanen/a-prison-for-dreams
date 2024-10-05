import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
import { CollisionObject } from "./collisionobject.js";
import { Player } from "./player.js";
import { Projectile } from "./projectile.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { SplinterGenerator } from "./splintergenerator.js";
import { Splinter } from "./splinter.js";
import { CollectableGenerator } from "./collectablegenerator.js";
import { CollectableType } from "./collectable.js";


const BASE_GRAVITY : number = 5.0;


export const enum BreakableType {

    Unknown = 0,
    Crate = 1
};


export class Breakable extends CollisionObject {


    private type : BreakableType = BreakableType.Unknown;

    private readonly splinters : SplinterGenerator;
    private readonly collectables : CollectableGenerator;


    constructor(x : number, y : number, type : BreakableType, 
        splinters : SplinterGenerator,
        collectables : CollectableGenerator) {

        super(x, y, true);

        this.collisionBox = new Rectangle(0, -1, 16, 16);
        this.hitbox = this.collisionBox.clone();

        // NOTE: as long as the stages are more horizontal than vertical, having
        // high vertical check area fixes problems with a pile of crates
        // (if the bottom-most crate is inactive, the one on the top of it will
        //  fall through)
        this.cameraCheckArea = new Vector(32, 1024);

        this.friction.y = 0.15;
        this.target.y = BASE_GRAVITY;
    
        this.type = type;

        this.splinters = splinters;
        this.collectables = collectables;
    }


    private spawnSplinters() : void {

        const SHIFT_X : number[] = [4, -4, -4, 4];
        const SHIFT_Y : number[] = [-4, -4, 4, 4];
        const FRAME_LOOKUP : number[] = [1, 0, 2, 3];

        const BASE_SPEED_MIN : number = 1.0;
        const BASE_SPEED_MAX : number = 2.0;
        const JUMP_Y_MIN : number = 2.0;
        const JUMP_Y_MAX : number = 1.0;

        for (let i : number = 0; i < 4; ++ i) {

            const angle : number = Math.PI/4 + Math.PI/2*i;

            const speed : number = BASE_SPEED_MIN + Math.random()*(BASE_SPEED_MAX - BASE_SPEED_MIN);
            const jumpSpeed : number = JUMP_Y_MIN + Math.random()*(JUMP_Y_MAX - JUMP_Y_MIN);
            const speedx : number = Math.cos(angle)*speed;
            const speedy : number = Math.sin(angle)*speed - jumpSpeed;

            const dx : number = this.pos.x + SHIFT_X[i];
            const dy : number = this.pos.y + SHIFT_Y[i];

            const o : Splinter = this.splinters.next();
            o.spawn(dx, dy, speedx, speedy, 0, FRAME_LOOKUP[i]);
        }
    }


    private spawnCollectables(dir : Vector) : void {

        const LAUNCH_SPEED_X : number = 1.0;
        const LAUNCH_SPEED_Y : number = 2.0;
        const BASE_JUMP : number = -1.0;

        this.collectables.spawn(this.pos.x, this.pos.y, 
            dir.x*LAUNCH_SPEED_X, dir.y*LAUNCH_SPEED_Y + BASE_JUMP, 
            CollectableType.Coin);
    }
    

    private breakSelf(dir : Vector, event : ProgramEvent) : void {

        this.exist = false;
        
        this.spawnSplinters();
        this.spawnCollectables(dir);
    }


    public objectCollision(o : CollisionObject, event : ProgramEvent, 
        swapComparison : boolean = false,
        ignoreBottom : boolean = false) : void {

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
        if (!ignoreBottom) {
            
            o.slopeCollision(x1 + X_OFFSET, y2, x2 - X_OFFSET*2, y2, -1, event);
        }
        o.wallCollision(x1, y1 + Y_OFFSET, y2 - y1 - Y_OFFSET*2, 1, event);
        o.wallCollision(x2, y1 + Y_OFFSET, y2 - y1 - Y_OFFSET*2, -1, event);

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

            this.breakSelf(Vector.direction(player.getPosition(), this.pos), event);

            // player.performDownAttackJump();
            this.exist = false;
        }
    }


    public projectileCollision(p : Projectile, event : ProgramEvent) : void {

        if (!this.isActive() || !p.isActive()) {

            return;
        }

        if (p.overlayObject(this)) {

            this.breakSelf(Vector.direction(p.getPosition(), this.pos),event);
            
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
