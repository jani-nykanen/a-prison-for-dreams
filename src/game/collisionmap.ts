import { ProgramEvent } from "../core/event.js";
import { clamp } from "../math/utility.js";
import { Vector } from "../math/vector.js";
import { Tilemap } from "../tilemap/tilemap.js";
import { CollisionObject } from "./collisionobject.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";


const enum CollisionBit {

    None = 0,

    Top    = 1 << 0,
    Right  = 1 << 1,
    Bottom = 1 << 2,
    Left   = 1 << 3,

    SlopeTopLeft     = 1 << 4,
    SlopeTopRight    = 1 << 5,
    SlopeBottomRight = 1 << 6,
    SlopeBottomLeft  = 1 << 7,

    GentleSlopeTopLeftFirst   = 1 << 8,
    GentleSlopeTopLeftSecond  = 1 << 9,
    GentleSlopeTopRightFirst  = 1 << 10,
    GentleSlopeTopRightSecond = 1 << 11,

    CorrectionSlopeBottomLeft  = 1 << 12,
    CorrectionSlopeBottomRight = 1 << 13,
    CorrectionSlopeTopRight    = 1 << 14,
    CorrectionSlopeTopLeft     = 1 << 15,

    SpikeBottom = 1 << 16,
    SpikeRight  = 1 << 17,
    SpikeTop    = 1 << 18,
    SpikeLeft   = 1 << 19,

    RoofTop         = 1 << 20,
    SlopeShortLeft  = 1 << 21,
    SlopeShortRight = 1 << 22,


    ContainsBottomLayer = 1 << 27,
}


const START_INDEX : number = 257;


export class CollisionMap {


    private collisions : number[];
    private width : number;
    private height : number;

    private readonly collisionMap : Tilemap;


    constructor(baseMap : Tilemap, collisionMap : Tilemap) {

        this.collisions = (new Array<number> (baseMap.width*baseMap.height)).fill(0);

        this.width = baseMap.width;
        this.height = baseMap.height;

        // This reference is only needed if the collision map is updated.
        this.collisionMap = collisionMap;

        this.createCollisionTiles(baseMap, collisionMap);
    }


    private getTile(x : number, y : number) : number {

        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {

            return 0;
        }
        return this.collisions[y*this.width + x];
    }


    private computeCollisionTile(x : number, y : number, baseMap : Tilemap, collisionMap : Tilemap) : void {

        const LAYER_NAME : string[] = ["bottom", "middle", "top"];

        const index : number = y*this.width + x;

        for (let layer : number = 0; layer < 3; ++ layer) {

            // TODO: A bit slow, maybe clone the tilemap and then do the magic?
            const tileID : number = baseMap.getTile(LAYER_NAME[layer], x, y);
            if (tileID <= 0) {

                continue;
            }

            for (let i : number = 0; i < 4; ++ i) {

                const colTileID : number = collisionMap.getIndexedTile(String(i + 1), tileID - 1) - START_INDEX;
                if (colTileID < 0)
                    continue;

                this.collisions[index] |= (1 << colTileID);
            }

            // TODO: If there are collisions from several layers, maybe disable this flag?
            if (this.collisions[index] != 0 && layer == 0) {

                this.collisions[index] |= CollisionBit.ContainsBottomLayer;
            }
        }
    }


    private createCollisionTiles(baseMap : Tilemap, collisionMap : Tilemap) : void {

        for (let y = 0; y < this.height; ++ y) {

            for (let x = 0; x < this.width; ++ x) {

                this.computeCollisionTile(x, y, baseMap, collisionMap);
            }
        }
    }


    private boxCollision(o : CollisionObject, x : number, y : number, w : number, h : number, event : ProgramEvent) : void {

        const VERTICAL_OFFSET : number = 1;

        o.slopeCollision(x, y, x + w, y, 1, event, 1, 1);
        o.slopeCollision(x, y + h, x + w, y + h, -1, event, 1 ,1);
        o.wallCollision(x, y + VERTICAL_OFFSET, h - VERTICAL_OFFSET*2, 1, event);
        o.wallCollision(x + w, y + VERTICAL_OFFSET, h - VERTICAL_OFFSET*2, -1, event);
    }


    private tileCollision(o : CollisionObject, x : number, y : number, colID : number, event : ProgramEvent) : void {

        const HORIZONTAL_OFFSET : number = 1;
        const VERTICAL_OFFSET : number = 1;

        const SLOPE_SAFE_MARGIN_NEAR : number = 2.0;
        const SLOPE_SAFE_MARGIN_FAR : number = 4.0;

        const SLOPE_MASK : number = 0b11111111 << 4;

        const GENTLE_SLOPE_SAFE_MARGIN_NEAR : number = 3.0;
        const GENTLE_SLOPE_SAFE_MARGIN_FAR : number = 4.0;

        const CORRECTION_SLOPE_LENGTH : number = 4;

        const SPIKE_WIDTH : number = 10;
        const SPIKE_HEIGHT : number = 8;
        const SPIKE_DAMAGE : number = 5;

        const dx : number = x*TILE_WIDTH;
        const dy : number = y*TILE_HEIGHT;

                
        // Check if ignores bottom layer
        if (o.doesIgnoreBottomLayer() && (colID & CollisionBit.ContainsBottomLayer) != 0) {

            return;
        }

        // Floor
        if ((colID & CollisionBit.Top) != 0 &&
            !o.doesIgnoreEvenSlopes()) {

            // If the floor is next to a slope, then ignore the object width.
            const leftTile : number = this.getTile(x - 1, y);
            const rightTile : number = this.getTile(x + 1, y);
            const leftMargin : number = Number((leftTile & SLOPE_MASK) == 0);
            const rightMargin : number = Number((rightTile & SLOPE_MASK) == 0);

            o.slopeCollision(
                dx + HORIZONTAL_OFFSET*leftMargin, dy, 
                dx + TILE_WIDTH - HORIZONTAL_OFFSET*rightMargin, dy, 
                1, event, 
                leftMargin, rightMargin);
        }
        // Ceiling
        if ((colID & CollisionBit.Bottom) != 0) {

            o.slopeCollision(dx + HORIZONTAL_OFFSET, dy + TILE_HEIGHT, 
                dx + TILE_WIDTH - HORIZONTAL_OFFSET, dy + TILE_HEIGHT, 
                -1, event);
        }
        // Left
        if ((colID & CollisionBit.Left) != 0) {

            o.wallCollision(dx, dy + VERTICAL_OFFSET, TILE_HEIGHT - VERTICAL_OFFSET*2, 1, event);
        }
        // Right
        if ((colID & CollisionBit.Right) != 0) {

            o.wallCollision(dx + TILE_WIDTH, dy + VERTICAL_OFFSET, TILE_HEIGHT - VERTICAL_OFFSET*2, -1, event);
        }


        // -------------------------------------- //


        const spikeOffX : number = (TILE_WIDTH - SPIKE_WIDTH)/2;
        const spikeOffY : number = TILE_HEIGHT - SPIKE_HEIGHT;

        // Spike bottom
        if ((colID & CollisionBit.SpikeBottom) != 0) {

            o.hurtCollision?.(dx + spikeOffX, dy + spikeOffY, SPIKE_WIDTH, SPIKE_HEIGHT, event, 0, SPIKE_DAMAGE);
            this.boxCollision(o, dx + spikeOffX, dy + spikeOffY, SPIKE_WIDTH, SPIKE_HEIGHT, event);
        }

        // Spike top
        if ((colID & CollisionBit.SpikeTop) != 0) {

            o.hurtCollision?.(dx + spikeOffX, dy, SPIKE_WIDTH, SPIKE_HEIGHT, event, 0, SPIKE_DAMAGE);
            this.boxCollision(o, dx + spikeOffX, dy, SPIKE_WIDTH, SPIKE_HEIGHT, event);
        }

        // Spike left
        if ((colID & CollisionBit.SpikeLeft) != 0) {

            o.hurtCollision?.(dx + spikeOffY, dy + spikeOffX, SPIKE_HEIGHT, SPIKE_WIDTH, event, 0, SPIKE_DAMAGE);
            this.boxCollision(o, dx + spikeOffY, dy + spikeOffX, SPIKE_HEIGHT, SPIKE_WIDTH, event);
        }

        // Spike right
        if ((colID & CollisionBit.SpikeRight) != 0) {

            o.hurtCollision?.(dx, dy + spikeOffX, SPIKE_HEIGHT, SPIKE_WIDTH, event, 0, SPIKE_DAMAGE);
            this.boxCollision(o, dx, dy + spikeOffX, SPIKE_HEIGHT, SPIKE_WIDTH, event);
        }

        // -------------------------------------- //

        // Slope top-left
        if ((colID & CollisionBit.SlopeTopLeft) != 0) {

            o.slopeCollision(dx, dy + TILE_HEIGHT, dx + TILE_WIDTH, dy, 1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        // Slope top-right
        if ((colID & CollisionBit.SlopeTopRight) != 0) {

            o.slopeCollision(dx, dy, dx + TILE_WIDTH, dy + TILE_HEIGHT, 1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        // Slope bottom-right
        if ((colID & CollisionBit.SlopeBottomRight) != 0) {

            o.slopeCollision(dx, dy + TILE_HEIGHT, dx + TILE_WIDTH, dy, -1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        // Slope top-right
        if ((colID & CollisionBit.SlopeBottomLeft) != 0) {

            o.slopeCollision(dx, dy, dx + TILE_WIDTH, dy + TILE_HEIGHT, -1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }

        // Gentle slope top-left
        if ((colID & CollisionBit.GentleSlopeTopLeftFirst) != 0) {

            o.slopeCollision(dx, dy + TILE_HEIGHT, dx + TILE_WIDTH, dy + TILE_HEIGHT/2, 1, event, 
                0, 0, GENTLE_SLOPE_SAFE_MARGIN_NEAR, GENTLE_SLOPE_SAFE_MARGIN_FAR);
        }
        if ((colID & CollisionBit.GentleSlopeTopLeftSecond) != 0) {

            o.slopeCollision(dx, dy + TILE_HEIGHT/2, dx + TILE_WIDTH, dy, 1, event, 
                0, 0, GENTLE_SLOPE_SAFE_MARGIN_NEAR, GENTLE_SLOPE_SAFE_MARGIN_FAR);
        }

        // Gentle slope top-right
        if ((colID & CollisionBit.GentleSlopeTopRightFirst) != 0) {

            o.slopeCollision(dx, dy, dx + TILE_WIDTH, dy + TILE_HEIGHT/2, 1, event, 
                0, 0, GENTLE_SLOPE_SAFE_MARGIN_NEAR, GENTLE_SLOPE_SAFE_MARGIN_FAR);
        }
        if ((colID & CollisionBit.GentleSlopeTopRightSecond) != 0) {

            o.slopeCollision(dx, dy + TILE_HEIGHT/2, dx + TILE_WIDTH, dy + TILE_HEIGHT, 1, event, 
                0, 0, GENTLE_SLOPE_SAFE_MARGIN_NEAR, GENTLE_SLOPE_SAFE_MARGIN_FAR);
        }

        // Correction slopes to top-left direction
        if ((colID & CollisionBit.CorrectionSlopeBottomLeft) != 0) {

            o.slopeCollision(
                dx - CORRECTION_SLOPE_LENGTH, dy + CORRECTION_SLOPE_LENGTH, dx, dy, 1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        if ((colID & CollisionBit.CorrectionSlopeTopRight) != 0) {

            o.slopeCollision(
                dx, dy, dx + CORRECTION_SLOPE_LENGTH, dy - CORRECTION_SLOPE_LENGTH, 1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }

        // Correction slopes to top-right direction
        if ((colID & CollisionBit.CorrectionSlopeBottomRight) != 0) {

            o.slopeCollision(
                dx + TILE_WIDTH, dy, 
                dx + TILE_WIDTH + CORRECTION_SLOPE_LENGTH, dy + CORRECTION_SLOPE_LENGTH, 1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        if ((colID & CollisionBit.CorrectionSlopeTopLeft) != 0) {

            o.slopeCollision(
                dx + TILE_WIDTH - CORRECTION_SLOPE_LENGTH, dy - CORRECTION_SLOPE_LENGTH, 
                dx + TILE_WIDTH, dy, 1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }

        // Rooftop
        if ((colID & CollisionBit.RoofTop) != 0) {

            o.slopeCollision(
                dx, dy + TILE_HEIGHT, 
                dx + TILE_WIDTH/2, dy + TILE_HEIGHT/2, 1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
            o.slopeCollision(
                dx + TILE_WIDTH/2, dy + TILE_HEIGHT/2, 
                dx + TILE_WIDTH, dy + TILE_HEIGHT, 1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }

        // Short slopes
        if ((colID & CollisionBit.SlopeShortLeft) != 0) {

            o.slopeCollision(dx + TILE_WIDTH/2, dy + TILE_HEIGHT/2, dx + TILE_WIDTH, dy, 1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
        if ((colID & CollisionBit.SlopeShortRight) != 0) {

            o.slopeCollision(dx, dy, dx + TILE_WIDTH/2, dy + TILE_HEIGHT/2, 1, event, 
                0, 0, SLOPE_SAFE_MARGIN_NEAR, SLOPE_SAFE_MARGIN_FAR);
        }
    }


    public objectCollision(o : CollisionObject, event : ProgramEvent,
        ignoreBottomLayer : boolean = false) : void {

        const MARGIN : number = 2;

        if (!o.isActive() || !o.doesTakeCollisions()) {

            return;
        }

        const p : Vector = o.getPosition();

        const startx : number = Math.floor(p.x/TILE_WIDTH) - MARGIN;
        const starty : number = Math.floor(p.y/TILE_HEIGHT) - MARGIN;

        const endx : number = startx + MARGIN*2;
        const endy : number = starty + MARGIN*2;

        for (let x : number = startx; x <= endx; ++ x) {

            for (let y : number = starty; y <= endy; ++ y) {

                /*
                if (x < 0 || y < 0 || x >= this.width || y >= this.height) {

                    continue;
                }
                */

                const dx : number = clamp(x, 0, this.width);
                const dy : number = clamp(y, 0, this.height);

                const colID : number = this.collisions[dy*this.width + dx] ?? 0;
                if (colID == 0 || (ignoreBottomLayer && (colID & CollisionBit.ContainsBottomLayer) != 0)) {

                    continue;
                }

                this.tileCollision(o, x, y, colID, event);
            }
        }
    }


    public recomputeCollisionTiles(tilesToUpdate : Map<string, number>) : void {

        for (const k of tilesToUpdate.keys()) {

            const tileID : number = tilesToUpdate.get(k);

            this.collisions[k] = 0;
            for (let i : number = 0; i < 4; ++ i) {

                const colTileID : number = this.collisionMap.getIndexedTile(String(i + 1), tileID - 1) - START_INDEX;
                if (colTileID < 0)
                    continue;

                this.collisions[k] |= (1 << colTileID);
            }
        }
    }
}

