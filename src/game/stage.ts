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
import { negMod } from "../math/utility.js";


const enum MapEffect {

    None = 0,
    Frozen = 1,
    FrozenBlackAndWhite = 2,
    Orangish = 3,
}


const mapEffectFromString = (str : string) : MapEffect => {

    switch (str) {

    case "frozen":
        return MapEffect.Frozen;
    
    case "frozenbw":
        return MapEffect.FrozenBlackAndWhite;

    case "orangish":
        return MapEffect.Orangish;

    default:
        break;
    }

    return MapEffect.None;
}


const PARTICLE_XOFF : number[] = [0, 2, -1, 1];
const PARTICLE_YOFF : number[] = [0, 3, -2, 2];
const PARTICLE_FRAME_SHIFT : number[] = [0, 2, 1, 3];

const FINAL_BOSS_ARENA_FADE_TIME : number = 60;


export class Stage {


    private collisions : CollisionMap;
    private renderlayer : RenderLayer;
    private bottomRow : boolean[];
    private objectLayer : number[] | undefined;

    // TODO: adding a class "WaterRenderer" (etc) would probably
    // simplify things.
    private hasLava : boolean = false;
    private lavaBrightness : number = 0.0;
    private lavaParticleTimer : number = 0.0;
    private waterSprite : Sprite;
    private surfaceLevel : number = 0;
    private initialSurfaceLevel : number = 0;
    private surfaceLevelRange : number | undefined = undefined;
    private surfaceLevelWave : number = 0.0;
    private backgroundWater : boolean = false;

    private background : Background;

    private leftExit : string | undefined = undefined;
    private rightExit : string | undefined = undefined;

    private switches : boolean[];

    private finalBossArenaEnabled : boolean = false;
    private topLayerDisabled : boolean = false;
    private layerFadeTimer : number = 0;
    private initialLayerFadeTime : number = 0;

    private effect : MapEffect;

    private darknessRadius : number = -1;
    private darknessRadiusModifier : number = 0;

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

        this.hasLava = baseMap.getBooleanProperty("has_lava") ?? false;
        this.initialSurfaceLevel = baseMap.getNumericProperty("water_level") ?? 0;
        this.surfaceLevel = this.initialSurfaceLevel;
    
        this.backgroundWater = baseMap.getBooleanProperty("background_water") ?? false;
        this.waterSprite = new Sprite(32, 16);

        this.background = new Background(this.height*TILE_HEIGHT, backgroundType);

        this.leftExit = baseMap.getProperty("leftexit");
        this.rightExit = baseMap.getProperty("rightexit");

        this.baseMap = baseMap;
    
        this.switches = (new Array<boolean> (3)).fill(false);

        this.effect = mapEffectFromString(this.baseMap.getProperty("effect") ?? "none");
        //if (this.effect == MapEffect.Darkness) {
        this.darknessRadius = this.baseMap.getNumericProperty("darkness_radius");
        //}

        this.surfaceLevelRange = this.baseMap.getNumericProperty("water_move_range");
    }


    private computeBottomRow(baseMap : Tilemap) : void {

        const LAYER_NAMES : string[] = ["bottom", "middle", "top"];

        for (let x : number = 0; x < this.width; ++ x) {

            for (const layer of LAYER_NAMES) {

                if (baseMap.getTile(layer, x, this.height - 1) != 0) {

                    this.bottomRow[x] = true;
                    break;
                }
            }
        }
    }


    private drawLavaParticles(canvas : Canvas, bmp : Bitmap | undefined, 
        camPos : Vector, surface : number, repeat : number = 1) : void {

        const XOFF : number = 16;
        const INITIAL_XOFF : number = 8;
        const INITIAL_YOFF : number = 11; 

        const baseFrame : number = Math.floor(this.lavaParticleTimer*4.0);

        const startx : number = Math.floor(camPos.x/XOFF) - 1;
        const endx : number = startx + Math.ceil(canvas.width/XOFF) + 2;

        for (let y : number = 0; y < repeat; ++ y) {

            const shiftx : number = (y % 2)*16;

            for (let x : number = startx; x < endx; ++ x) {

                const i : number = negMod(x, 4);

                const dx : number = INITIAL_XOFF + x*XOFF + PARTICLE_XOFF[i];
                const dy : number = INITIAL_YOFF + surface + PARTICLE_YOFF[i];

                const frame : number = (baseFrame + PARTICLE_FRAME_SHIFT[i]) % 4;

                canvas.drawBitmap(bmp, Flip.None, dx + shiftx, dy + y*16, frame*8, 48, 8, 8);
            }
        }
    }


    private drawWater(canvas : Canvas, assets : Assets, camera : Camera, 
        opacity : number, surfaceOpacity : number = 0.0) : void {

        const WATER_WIDTH : number = 32;
        const BRIGTHNESS_RANGE : number = 0.20;

        if (this.surfaceLevel <= 0) {

            return;
        }

        const bmpWater : Bitmap = assets.getBitmap("water");
        if (bmpWater === undefined) {

            return;
        }

        const camPos : Vector = camera.getCorner();
        const dy : number = (this.height - this.surfaceLevel)*TILE_HEIGHT - TILE_HEIGHT/2;

        if (dy > camPos.y + camera.height) {

            return;
        }

        const startx : number = Math.floor(camPos.x/WATER_WIDTH) - 1;
        const endx : number = startx + Math.ceil(camera.width/WATER_WIDTH) + 2;

        const baseShift : number = this.hasLava ? 2 : 0;

        let brightness : number = 1.0;
        if (this.hasLava) {

            brightness = 1.0 + Math.sin(this.lavaBrightness)*BRIGTHNESS_RANGE;
        }

        if (this.hasLava) {

            canvas.setColor(255*brightness, 255*brightness, 255*brightness);
        }

        // Base water (or lava)
        for (let i : number = 0; i < 2; ++ i) {

            if (!this.hasLava) {

                canvas.setAlpha(i == 0 ? opacity : surfaceOpacity);
            }

            for (let x : number = startx; x < endx; ++ x) {

                this.waterSprite.drawWithShiftedRow(canvas, bmpWater, 
                    x*WATER_WIDTH, dy, Flip.None, baseShift + i);
            }  
            
            if (!this.hasLava) {
            
                canvas.setAlpha();
            }

            if (this.hasLava || opacity >= 1.0 || surfaceOpacity <= 0.0) {

                break;
            }
        }

        // Bottom 
        const bottomHeight : number = this.height*TILE_HEIGHT - (dy + 16);
        if (bottomHeight > 0) {

            if (this.hasLava) {

                canvas.setColor(219*brightness, 73*brightness, 0*brightness);
            }
            else {

                canvas.setColor(30, 109, 219, opacity);
            }
            // Note: draw some extra since I have some bugs with camera after
            // transitions...
            // Another note: not sure if already fixed or not
            canvas.fillRect(camPos.x, dy + 16, canvas.width, bottomHeight + 16);
            canvas.setColor();
        }
        
        if (this.hasLava) {

            const repeat : number = Math.ceil(bottomHeight/16) + 1;

            canvas.setColor(255*brightness, 255*brightness, 255*brightness);
            this.drawLavaParticles(canvas, bmpWater, camPos, dy, repeat);
            canvas.setColor();
        }
    }


    private drawDarkness(canvas : Canvas, playerPosition : Vector) : void {

        const MODIFIER_AMPLITUDE : number = 4;

        const radius : number = this.darknessRadius +
            Math.sin(this.darknessRadiusModifier)*MODIFIER_AMPLITUDE;

        canvas.setColor(0, 0, 0);
        canvas.fillCircleOutside(playerPosition.x, playerPosition.y, radius);
        canvas.setColor();
    }


    private applyMapEffect(canvas : Canvas) : void {

        switch (this.effect) {

        // Unused
        case MapEffect.Frozen:

            canvas.applyEffect(Effect.SwapRedAndBlue);
            break;

        case MapEffect.FrozenBlackAndWhite:

            canvas.applyEffect(Effect.BlackAndWhite);
            canvas.setColor(255*0.90, 255*1.1, 255*1.25);
            break;

        case MapEffect.Orangish:

            canvas.applyEffect(Effect.BlackAndWhite);
            canvas.setColor(255*1.25, 182*1.25, 146*1.25);
            break;

        default:
            break;
        }
    }


    public update(camera : Camera, event : ProgramEvent) : void {

        const WATER_ANIMATION_SPEED : number = 8;
        const DARKNESS_RADIUS_MODIFIER_SPEED : number = Math.PI*2/180;
        const LAVA_BRIGHTNESS_SPEED : number = Math.PI*2/120.0;
        const LAVA_PARTICLE_SPEED : number = 1.0/45.0;
        const SURFACE_LEVEL_SPEED : number = 360;

        this.waterSprite.animate(0, 0, 3, WATER_ANIMATION_SPEED, event.tick);

        this.background.update(camera, event);

        if (this.layerFadeTimer > 0) {

            this.layerFadeTimer -= event.tick;
        }

        if (this.darknessRadius > 0) {

            this.darknessRadiusModifier = 
            (this.darknessRadiusModifier + 
                DARKNESS_RADIUS_MODIFIER_SPEED*event.tick) % (Math.PI*2);
        }

        if (this.hasLava) {

            this.lavaBrightness = (this.lavaBrightness + LAVA_BRIGHTNESS_SPEED*event.tick) % (Math.PI*2);
            this.lavaParticleTimer = (this.lavaParticleTimer + LAVA_PARTICLE_SPEED*event.tick) % 1.0;
        }

        if (this.surfaceLevelRange !== undefined) {

            const surfaceSpeed : number = Math.PI*2/SURFACE_LEVEL_SPEED;
            this.surfaceLevelWave = (this.surfaceLevelWave + surfaceSpeed*event.tick) % (Math.PI*2);

            this.surfaceLevel = this.initialSurfaceLevel - Math.sin(this.surfaceLevelWave)*this.surfaceLevelRange;
        }
    }


    public drawBackground(canvas : Canvas, assets : Assets, camera : Camera) : void {

        if (this.effect != MapEffect.Orangish) {

            this.applyMapEffect(canvas);
        }

        this.background.draw(canvas, assets, camera);
        
        if (this.effect != MapEffect.None &&
            this.effect != MapEffect.Orangish) {

            canvas.applyEffect(Effect.None);
            canvas.setColor();
        }
    }


    public draw(canvas : Canvas, assets : Assets, tilesetIndex : number, camera : Camera) : void {

        const BACKGROUND_WATER_OPACITY : number = 0.33;
        const BACKGROUND_WATER_SURFACE_OPACITY : number = 0.50;

        const tileset : Bitmap | undefined = assets.getBitmap(`tileset_${tilesetIndex}`);

        if (this.backgroundWater && this.surfaceLevel > 0) {

            this.drawWater(canvas, assets, camera, 
                BACKGROUND_WATER_OPACITY, BACKGROUND_WATER_SURFACE_OPACITY);
        }

        let topLayerOpacity : number = this.topLayerDisabled ? 0.0 : 1.0;
        if (this.layerFadeTimer > 0) {

            let t : number = 0.0;
            if (this.initialLayerFadeTime > 0) {

                t = this.layerFadeTimer/this.initialLayerFadeTime;
            }

            topLayerOpacity = this.topLayerDisabled ? t : 1.0 - t;
        }

        this.applyMapEffect(canvas);

        // A stupid workaround, the first two layers were never
        // supposed to fade...
        if (this.finalBossArenaEnabled && this.layerFadeTimer > 0) {

            const alpha : number = this.layerFadeTimer/FINAL_BOSS_ARENA_FADE_TIME;
            canvas.setAlpha(alpha);
            this.renderlayer.draw(canvas, tileset, camera, 1.0, 0, 1);
            canvas.setAlpha();
        }

        this.renderlayer.draw(canvas, tileset, camera, topLayerOpacity,
            this.finalBossArenaEnabled ? 2 : 0);

        if (this.effect != MapEffect.None) {

            canvas.applyEffect(Effect.None);
            canvas.setColor();
        }
    }


    public drawForeground(canvas : Canvas, assets : Assets, 
        camera : Camera, playerPosition : Vector) : void {

        const FOREGROUND_WATER_OPACITY : number = 0.75;

        if (!this.backgroundWater && this.surfaceLevel > 0) {

            this.drawWater(canvas, assets, camera, FOREGROUND_WATER_OPACITY);
        }

        this.background.postDraw(canvas, assets);

        if (this.darknessRadius > 0) {
            
            this.drawDarkness(canvas, playerPosition);
        }
    }


    public objectCollision(o : CollisionObject, event : ProgramEvent) : void {

        const WATER_OFFSET_Y : number = 0;
        const EDGE_OFFSET_Y : number = -256;
        const SURFACE_HEIGHT : number = 8;

        if (!o.isActive() || !o.doesTakeCollisions()) {

            return;
        }

        this.collisions.objectCollision(o, event, this.finalBossArenaEnabled);

        const totalWidth : number = this.width*TILE_WIDTH;
        const totalHeight : number = this.height*TILE_HEIGHT;
        const waterSurface : number = Math.min(totalHeight, (this.height - this.surfaceLevel)*TILE_HEIGHT + WATER_OFFSET_Y);

        const opos : Vector = o.getPosition();
        const hbox : Rectangle = o.getCollisionBox();

        if (this.surfaceLevel > 0) {
            
            if (this.hasLava) {

                o.lavaCollision?.(waterSurface, event);
                o.slopeCollision(0, waterSurface + 2, this.width*TILE_WIDTH, waterSurface + 2, 1, event);
            }
            else {

                o.waterCollision?.(opos.x - 16, waterSurface, 
                    32, SURFACE_HEIGHT, 
                    event, true);
                o.waterCollision?.(opos.x - 16, waterSurface + SURFACE_HEIGHT, 
                    32, this.height*TILE_HEIGHT - waterSurface - SURFACE_HEIGHT, 
                    event, false);
            }
        }

        if (o.doesTakeCollisions()) {

            o.wallCollision(0, EDGE_OFFSET_Y, totalHeight - EDGE_OFFSET_Y, -1, event);
            o.wallCollision(totalWidth, EDGE_OFFSET_Y, totalHeight - EDGE_OFFSET_Y, 1, event);
        }

        if (o.getPosition().y + hbox.y - hbox.h/2 > this.height*TILE_HEIGHT) {

            o.instantKill(event);
        }

        if (!this.finalBossArenaEnabled) {

            if (this.rightExit !== undefined) {

                o.screenTransitionEvent?.(this.width*TILE_WIDTH, 1, this.rightExit, event);
            }
            if (this.leftExit !== undefined) {

                o.screenTransitionEvent?.(0, -1, this.leftExit, event);
            }
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

        this.layerFadeTimer = fadeTime;
        this.initialLayerFadeTime = fadeTime;
    }


    public enableFinalBossArena() : void{

        this.finalBossArenaEnabled = true;
        // this.layerFadeTimer = fadeTime;
        // this.initialLayerFadeTime = fadeTime;

        this.layerFadeTimer = FINAL_BOSS_ARENA_FADE_TIME;
    } 


    public changeBackground(newType? : BackgroundType) : void {

        this.background.changeType(newType);
    }


    public reset() : void {

        this.changeBackground();

        this.finalBossArenaEnabled = false;
        this.topLayerDisabled = false;
        this.layerFadeTimer = 0;
        this.initialLayerFadeTime = 0;
    }
}
