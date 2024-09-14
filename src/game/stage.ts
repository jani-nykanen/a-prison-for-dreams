import { Tilemap } from "../tilemap/tilemap.js";
import { CollisionMap } from "./collisionmap.js";
import { ProgramEvent } from "../core/event.js";
import { Bitmap, Canvas, Effect, Flip } from "../gfx/interface.js";
import { RenderLayer } from "./renderlayer.js";
import { Camera } from "./camera.js";
import { CollisionObject } from "./collisionobject.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Vector } from "../math/vector.js";
import { Assets } from "../core/assets.js";
import { Sprite } from "../gfx/sprite.js";



export class Stage {


    private collisions : CollisionMap;
    private renderlayer : RenderLayer;
    private bottomRow : boolean[];
    private objectLayer : number[] | undefined;

    private waterSprite : Sprite;
    private waterLevel : number = 0;

    public readonly width : number;
    public readonly height : number;


    constructor(baseMap : Tilemap, collisionMap : Tilemap) {

        this.collisions = new CollisionMap(baseMap, collisionMap);
        this.renderlayer = new RenderLayer(baseMap);

        this.width = baseMap.width;
        this.height = baseMap.height;

        this.bottomRow = (new Array<boolean> (this.width)).fill(false);
        this.computeBottomRow(baseMap);

        this.objectLayer = baseMap.cloneLayer("objects");

        this.waterLevel = Number(baseMap.getProperty("water_level") ?? "0");

        this.waterSprite = new Sprite(32, 16);
    }


    private computeBottomRow(baseMap : Tilemap) : void {

        const LAYER_NAMES : string[] = ["bottom", "middle", "top"];

        for (let x = 0; x < this.width; ++ x) {

            for (let layer of LAYER_NAMES) {

                if (baseMap.getTile(layer, x, this.height - 1) != 0) {

                    this.bottomRow[x] = true;
                    break;
                }
            }
        }
    }


    private generateWaterSpriteBatch(canvas : Canvas, bmp : Bitmap, wave : number) : void {

        const AMPLITUDE : number = 2.0;

        const waveFunction : (t : number) => number = t => 
            Math.round(Math.sin(wave + (Math.PI*2)/32*t)*AMPLITUDE + Math.sin(Math.PI/8*t));

        canvas.beginSpriteBatching(bmp);
        for (let x = 0; x < 32; ++ x) {

            canvas.drawBitmap(bmp, Flip.None, x, waveFunction(x), (x % 16), 0, 1, bmp.height);
        }
        canvas.endSpriteBatching();
    }


    private drawWater(canvas : Canvas, assets : Assets, camera : Camera, isLava : boolean = false) : void {

        const WATER_OPACITY : number = 0.75;
        const WATER_WIDTH : number = 32;

        if (this.waterLevel <= 0) {

            return;
        }

        const bmpWater : Bitmap = assets.getBitmap("water");
        if (bmpWater === undefined) {

            return;
        }

        const camPos : Vector = camera.getCorner();
        const dy : number = (this.height - this.waterLevel)*TILE_HEIGHT - TILE_HEIGHT/2;

        if (dy > camPos.y + camera.height) {

            return;
        }

        const startx : number = Math.floor(camPos.x/WATER_WIDTH) - 1;
        const endx : number = startx + Math.ceil(camera.width/WATER_WIDTH) + 2;

        canvas.setAlpha(WATER_OPACITY);
        for (let x = startx; x < endx; ++ x) {

            this.waterSprite.draw(canvas, bmpWater, x*WATER_WIDTH, dy);
        }  
        canvas.setAlpha();

        const bottomHeight : number = this.height*TILE_HEIGHT - (dy + 16);
        if (bottomHeight > 0) {

            canvas.setColor(30, 109, 219, WATER_OPACITY);
            canvas.fillRect(camPos.x, dy + 16, canvas.width, bottomHeight);
            canvas.setColor();
        }
        
    }


    public update(event : ProgramEvent) : void {

        const WATER_ANIMATION_SPEED : number = 8;

        this.waterSprite.animate(0, 0, 3, WATER_ANIMATION_SPEED, event.tick);
    }


    public draw(canvas : Canvas, assets : Assets, camera : Camera) : void {

        this.renderlayer.draw(canvas, assets, camera);
    }


    public drawForegroundLayer(canvas : Canvas, assets : Assets, camera : Camera) : void {

        if (this.waterLevel > 0) {

            this.drawWater(canvas, assets, camera);
        }
    }


    public objectCollision(o : CollisionObject, event : ProgramEvent) : void {

        const LAVA_OFFSET_Y : number = 8;
        const EDGE_OFFSET_Y : number = -256;

        this.collisions.objectCollision(o, event);

        const totalWidth : number = this.width*TILE_WIDTH;
        const totalHeight : number = this.height*TILE_HEIGHT;
        const lavaPos : number = Math.min(totalHeight, (this.height - this.waterLevel)*TILE_HEIGHT + LAVA_OFFSET_Y);

        o.slopeCollision(0, lavaPos, totalWidth, lavaPos, 1, event);
        o.hurtCollision?.(0, lavaPos, totalWidth, 999, event, 0, 999);

        o.wallCollision(0, EDGE_OFFSET_Y, totalHeight - EDGE_OFFSET_Y, -1, event);
        o.wallCollision(totalWidth, EDGE_OFFSET_Y, totalHeight - EDGE_OFFSET_Y, 1, event);
    }


    public iterateObjectLayer(func : (x : number, y : number, objectID : number) => void) : void {

        const START_INDEX : number = 256;

        if (this.objectLayer === undefined)
            return;

        for (let y = 0; y < this.height; ++ y) {

            for (let x = 0; x < this.width; ++ x) {

                func(x, y, this.objectLayer[y*this.width + x] - START_INDEX);
            }
        }
    }
}
