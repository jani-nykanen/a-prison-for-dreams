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
import { Rectangle } from "../math/rectangle.js";
import { Background, BackgroundType } from "./background.js";


export class Stage {


    private collisions : CollisionMap;
    private renderlayer : RenderLayer;
    private bottomRow : boolean[];
    private objectLayer : number[] | undefined;

    private waterSprite : Sprite;
    private waterLevel : number = 0;
    private backgroundWater : boolean = false;

    private background : Background;

    private leftExit : string | undefined = undefined;
    private rightExit : string | undefined = undefined;

    private switches : boolean[];

    private topLayerDisabled : boolean = false;
    private topLayerFadeTimer : number = 0;
    private topLayerInitialFadeTime : number = 0;

    public readonly width : number;
    public readonly height : number;

    public readonly baseMap : Tilemap;


    constructor(backgroundType : BackgroundType | undefined, 
        baseMap : Tilemap, collisionMap : Tilemap) {

        this.collisions = new CollisionMap(baseMap, collisionMap);
        this.renderlayer = new RenderLayer(baseMap);

        this.width = baseMap.width;
        this.height = baseMap.height;

        this.bottomRow = (new Array<boolean> (this.width)).fill(false);
        this.computeBottomRow(baseMap);

        this.objectLayer = baseMap.cloneLayer("objects");

        this.waterLevel = baseMap.getNumericProperty("water_level") ?? 0;
        this.backgroundWater = baseMap.getBooleanProperty("background_water") ?? false;
        this.waterSprite = new Sprite(32, 16);

        this.background = new Background(this.height*TILE_HEIGHT, backgroundType);

        this.leftExit = baseMap.getProperty("leftexit");
        this.rightExit = baseMap.getProperty("rightexit");

        this.baseMap = baseMap;
    
        this.switches = (new Array<boolean> (3)).fill(false);
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


    private drawWater(canvas : Canvas, assets : Assets, camera : Camera, opacity : number) : void {

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

        canvas.setAlpha(opacity);
        for (let x = startx; x < endx; ++ x) {

            this.waterSprite.draw(canvas, bmpWater, x*WATER_WIDTH, dy);
        }  
        canvas.setAlpha();

        const bottomHeight : number = this.height*TILE_HEIGHT - (dy + 16);
        if (bottomHeight > 0) {

            canvas.setColor(30, 109, 219, opacity);
            canvas.fillRect(camPos.x, dy + 16, canvas.width, bottomHeight);
            canvas.setColor();
        }
        
    }


    public update(camera : Camera, event : ProgramEvent) : void {

        const WATER_ANIMATION_SPEED : number = 8;

        this.waterSprite.animate(0, 0, 3, WATER_ANIMATION_SPEED, event.tick);

        this.background.update(camera, event);

        if (this.topLayerFadeTimer > 0) {

            this.topLayerFadeTimer -= event.tick;
        }
    }


    public drawBackground(canvas : Canvas, assets : Assets, camera : Camera) : void {

        this.background.draw(canvas, assets, camera);
    }


    public draw(canvas : Canvas, assets : Assets, tilesetIndex : number, camera : Camera) : void {

        const BACKGROUND_WATER_OPACITY : number = 0.33;

        const tileset : Bitmap | undefined = assets.getBitmap(`tileset_${tilesetIndex}`);

        if (this.backgroundWater && this.waterLevel > 0) {

            this.drawWater(canvas, assets, camera, BACKGROUND_WATER_OPACITY);
        }

        let topLayerOpacity : number = this.topLayerDisabled ? 0.0 : 1.0;
        if (this.topLayerFadeTimer > 0) {

            let t : number = 0.0;
            if (this.topLayerInitialFadeTime > 0) {

                t = this.topLayerFadeTimer/this.topLayerInitialFadeTime;
            }

            topLayerOpacity = this.topLayerDisabled ? t : 1.0 - t;
        }

        this.renderlayer.draw(canvas, tileset, camera, topLayerOpacity);
    }


    public drawForeground(canvas : Canvas, assets : Assets, camera : Camera) : void {

        const FOREGROUND_WATER_OPACITY : number = 0.75;

        if (!this.backgroundWater && this.waterLevel > 0) {

            this.drawWater(canvas, assets, camera, FOREGROUND_WATER_OPACITY);
        }

        this.background.postDraw(canvas, assets);
    }


    public objectCollision(o : CollisionObject, event : ProgramEvent) : void {

        const WATER_OFFSET_Y : number = 0;
        const EDGE_OFFSET_Y : number = -256;
        const SURFACE_HEIGHT : number = 8;

        if (!o.isActive() || !o.doesTakeCollisions()) {

            return;
        }

        this.collisions.objectCollision(o, event);

        const totalWidth : number = this.width*TILE_WIDTH;
        const totalHeight : number = this.height*TILE_HEIGHT;
        const waterSurface : number = Math.min(totalHeight, (this.height - this.waterLevel)*TILE_HEIGHT + WATER_OFFSET_Y);

        const opos : Vector = o.getPosition();
        const hbox : Rectangle = o.getCollisionBox();

        if (waterSurface > 0 && o.waterCollision !== undefined) {
            
            o.waterCollision(opos.x - 16, waterSurface, 
                32, SURFACE_HEIGHT, 
                event, true);
            o.waterCollision(opos.x - 16, waterSurface + SURFACE_HEIGHT, 
                32, this.height*TILE_HEIGHT - waterSurface - SURFACE_HEIGHT, 
                event, false);
        }

        o.wallCollision(0, EDGE_OFFSET_Y, totalHeight - EDGE_OFFSET_Y, -1, event);
        o.wallCollision(totalWidth, EDGE_OFFSET_Y, totalHeight - EDGE_OFFSET_Y, 1, event);

        if (o.getPosition().y + hbox.y - hbox.h/2 > this.height*TILE_HEIGHT) {

            o.instantKill(event);
        }

        if (this.rightExit !== undefined) {

            o.screenTransitionEvent?.(this.width*TILE_WIDTH, 1, this.rightExit, event);
        }
        if (this.leftExit !== undefined) {

            o.screenTransitionEvent?.(0, -1, this.leftExit, event);
        }
    }


    public iterateObjectLayer(func : (x : number, y : number, objectID : number, upperID? : number) => void) : void {

        const START_INDEX : number = 256;

        if (this.objectLayer === undefined) {
            
            return;
        }

        for (let y : number = 0; y < this.height; ++ y) {

            for (let x : number = 0; x < this.width; ++ x) {

                const upperID : number = y > 0 ? this.objectLayer[(y - 1)*this.width + x] - START_INDEX : 0;
                func(x, y, this.objectLayer[y*this.width + x] - START_INDEX, upperID);
            }
        }
    }


    public initializeBackground(camera : Camera) : void {

        this.background.initialize(camera);
    }


    public toggleSwitch(index : number) : void {

        if (index < 0 || index >= 3) {

            return;
        }
        this.switches[index] = !this.switches[index];
        this.collisions.recomputeCollisionTiles(this.renderlayer.toggleColorBlocks(index));
    }


    public getSwitchState = (index : number) : boolean => this.switches[index] ?? false;


    public toggleTopLayerRendering(state : boolean, fadeTime : number = 60) : void {

        this.topLayerDisabled = !state;

        this.topLayerFadeTimer = fadeTime;
        this.topLayerInitialFadeTime = fadeTime;
    }


    public changeBackground(newType? : BackgroundType) : void {

        this.background.changeType(newType);
    }


    public reset() : void {

        this.changeBackground();

        this.topLayerDisabled = false;
        this.topLayerFadeTimer = 0;
        this.topLayerInitialFadeTime = 0;
    }
}
