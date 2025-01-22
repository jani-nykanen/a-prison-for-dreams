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
import { Snowflake } from "./snowflake.js";
import { RGBA } from "../math/rgba.js";
import { Starfield } from "./starfield.js";


const CLOUD_COLOR_MOD_1 : RGBA = new RGBA(1.0);
const CLOUD_COLOR_MOD_2 : RGBA = new RGBA(182/255, 219/255, 1.0);
const CLOUD_COLOR_MOD_3 : RGBA = new RGBA(255/255, 146/255, 109/255);


const SPECIAL_SUN_COLORS_1 : RGBA[] = [
    new RGBA(255, 219, 109),
    new RGBA(255, 182, 0)
];

const SPECIAL_SUN_COLORS_2 : RGBA[] = [
    new RGBA(219, 109, 73),
    new RGBA(255, 146, 109)
];


const SNOWFLAKE_TABLE : boolean[] = [true, false, false, false, false, false, true, false, true, true, false, true, false, true];


export const enum BackgroundType {
    
    Unspecified = -1,
    Graveyard = 0,
    Coast = 1,
    Forest = 2,
    Cave = 3,
    NightSky = 4,
    StarField = 5,
    NightSkyWithForest = 6,
    FrozenCave = 7,
    BurningSun = 8,
    NightSkyWithSnow = 9,
    CastleWall = 10,
    NightSkyWithSnowSpecialShift = 11,
    AltStarField = 12,
    FinalGraveyard = 13,
};


export class Background {


    private oldType : BackgroundType = BackgroundType.Unspecified;
    private type : BackgroundType;
    private height : number;

    private cloudPos : number = 0;
    private lightMagnitude : number = 0;
    private sunAngle : number = 0;

    private snowflakes : Snowflake[];
    private starfield : Starfield | undefined = undefined;
    private snowflakeColor : RGBA | undefined = undefined;;


    constructor(height : number, type : BackgroundType | undefined) {

        this.cloudPos = Math.random();

        this.height = height;
        this.type = type ?? BackgroundType.Unspecified;
        this.oldType = this.type;

        this.snowflakes = new Array<Snowflake> ();

        this.snowflakeColor = new RGBA(255, 255, 255, 0.5);

        switch (this.type) {

        case BackgroundType.StarField:

            this.starfield = new Starfield();
            break;

        case BackgroundType.FinalGraveyard:
        case BackgroundType.Graveyard:

            this.snowflakeColor = new RGBA(0, 0, 0, 0.5);
            break;

        // case BackgroundType.CastleWall:
        case BackgroundType.NightSkyWithSnowSpecialShift:
        case BackgroundType.NightSkyWithSnow:
        case BackgroundType.NightSkyWithForest:

            this.snowflakeColor = new RGBA(255, 255, 255, 0.5);
            break;

        case BackgroundType.BurningSun:

            this.snowflakeColor = new RGBA(182, 36, 0, 0.5);
            break;

        case BackgroundType.AltStarField:

            this.starfield = new Starfield(36, 109, 219);
            break;

        default:
            break;
        }
    }


    private hasSnowflakes = () : boolean => SNOWFLAKE_TABLE[this.type] ?? false;


    private initializeSnowflakes(camera : Camera) : void {

        const area : number = camera.width*camera.height;
        const count : number = area/(32*32);

        for (let i : number = 0; i < count; ++ i) {

            const x : number = Math.random()*camera.width;
            const y : number = Math.random()*camera.height;

            this.snowflakes.push(new Snowflake(x, y, 1.0));
        }
    } 


    private updateCoast(event : ProgramEvent) : void {

        const CLOUD_SPEED : number = 1.0/1024.0;

        this.cloudPos = (this.cloudPos + CLOUD_SPEED*event.tick) % 1.0;
    }


    private updateClouds(speedMod : number, event : ProgramEvent) : void {

        const CLOUD_SPEED : number = 1.0/2048.0;

        this.cloudPos = (this.cloudPos + speedMod*CLOUD_SPEED*event.tick) % 1.0;
    }


    private updateCave(event : ProgramEvent) : void {

        const LIGHT_SPEED : number = Math.PI*2/120; // Might want to rename this...

        this.lightMagnitude = (this.lightMagnitude + LIGHT_SPEED*event.tick) % (Math.PI*2);
    }


    private updateSpecialSun(event : ProgramEvent) : void {

        const ROTATION_SPEED : number = Math.PI*2/600.0;

        this.sunAngle = (this.sunAngle + ROTATION_SPEED*event.tick) % (Math.PI*2);
    }


    private drawDefaultSky(canvas : Canvas, assets : Assets) : void {

        const bmpStars : Bitmap | undefined = assets.getBitmap("stars");
        canvas.drawBitmap(bmpStars, Flip.None, 0, 0, 0, 0, canvas.width, canvas.height, canvas.width, canvas.height);

        const bmpSun : Bitmap | undefined  = assets.getBitmap("sun");
        if (bmpSun !== undefined) {

            canvas.drawBitmap(bmpSun, Flip.None, canvas.width - 80, 16, 0, 0, 64, 64);
        }
    }


    private drawMoon(canvas : Canvas, assets : Assets, id : number = 0) : void {

        const bmpMoon : Bitmap | undefined  = assets.getBitmap("moon");
        if (bmpMoon !== undefined) {

            canvas.drawBitmap(bmpMoon, 
                Flip.None, 
                canvas.width - 96, 16, 
                id*64, 0, 64, 64);
        }

    }


    private drawClouds(canvas : Canvas, assets : Assets, camera : Camera, 
        colorMod : RGBA, shifty : number = 0.0) : void {

        const bmpClouds : Bitmap | undefined  = assets.getBitmap("clouds_0");
        if (bmpClouds === undefined) {

            return;
        }

        const camPos : Vector = camera.getCorner();
        const count : number = Math.floor(canvas.width/bmpClouds.width) + 2;

        for (let y : number = 2; y >= 0; -- y) {

            const color : number = 255 - y*73;

            canvas.setColor(colorMod.r*color, colorMod.g*color, colorMod.b*color);

            const shiftx : number = -((camPos.x/(8 + y*8) + this.cloudPos*bmpClouds.width*(3 - y) ) % bmpClouds.width);
            const dy : number = 96 - (camPos.y + shifty)/8 - y*24;

            for (let x : number = -1; x < count; ++ x) {

                canvas.drawBitmap(bmpClouds, Flip.None, x*bmpClouds.width + shiftx, dy);
            }  

            const bottom : number = canvas.height - dy;
            if (y == 0 && bottom > 0) {

                // I made this funny observation that right, I never made fillRect
                // work with special effects. This is a workaround as I cannot
                // fillRect the bottom part...
                canvas.drawBitmap(bmpClouds, Flip.None, 0, dy + bmpClouds.height, 
                    0, 80, bmpClouds.width, 16,
                    canvas.width, bottom);
            }
        }

        canvas.setColor();
    }


    private drawGraveyard(canvas : Canvas, assets : Assets, camera : Camera) : void {

        canvas.clear(255, 255, 255);

        this.drawMoon(canvas, assets, 0);
        this.drawClouds(canvas, assets, camera, CLOUD_COLOR_MOD_1);
    }


    private drawCoast(canvas : Canvas, assets : Assets, camera : Camera) : void {

        this.drawDefaultSky(canvas, assets);

        const bmpClouds : Bitmap | undefined  = assets.getBitmap("clouds_1");
        if (bmpClouds === undefined) {

            return;
        }

        const camPos : Vector = camera.getCorner();
        const count : number = Math.floor(canvas.width/bmpClouds.width) + 2;

        const shiftx : number = -((camPos.x/8 + this.cloudPos*bmpClouds.width) % bmpClouds.width);
        const dy : number = 80 - camPos.y/8;
        for (let x : number = -1; x < count; ++ x) {

            canvas.drawBitmap(bmpClouds, Flip.None, x*bmpClouds.width + shiftx, dy);
        }  
        const bottomHeight : number = this.height - (dy + bmpClouds.height);
        if (bottomHeight > 0) {

            // canvas.setColor(36, 146, 255);
            // canvas.fillRect(0, dy + bmpClouds.height, canvas.width, bottomHeight);
            canvas.drawBitmap(bmpClouds, Flip.None, 0, dy + bmpClouds.height, 0, 
                bmpClouds.height - 2, bmpClouds.width, 2, canvas.width, bottomHeight);
            // canvas.setColor();
        }
    }


    private drawTrees(canvas : Canvas, assets : Assets, camera : Camera, darken : number = 0.0) : void {

        const bmpForest : Bitmap | undefined  = assets.getBitmap("forest");
        if (bmpForest === undefined) {

            return;
        }

        const colorMod : number = 1.0 - darken;

        const camPos : Vector = camera.getCorner();
        const count : number = Math.floor(canvas.width/bmpForest.width) + 2;

        if (colorMod > 0) {

            canvas.setColor(255*colorMod, 255*colorMod, 255*colorMod);
        }

        const shiftx : number = -((camPos.x/8) % bmpForest.width);
        const dy : number = 80 - camPos.y/8;
        for (let x : number = -1; x < count; ++ x) {

            canvas.drawBitmap(bmpForest, Flip.None, x*bmpForest.width + shiftx, dy);
        }  
        const bottomHeight : number = this.height - (dy + bmpForest.height);
        if (bottomHeight > 0) {

            canvas.setColor(0*colorMod, 146*colorMod, 219*colorMod);
            canvas.fillRect(0, dy + bmpForest.height, canvas.width, bottomHeight);
            canvas.setColor();
        }
    }


    private drawForestBackground(canvas : Canvas, assets : Assets, camera : Camera) : void {

        this.drawDefaultSky(canvas, assets);
        this.drawTrees(canvas, assets, camera);
    }


    private drawCaveBackground(canvas : Canvas, assets : Assets, camera : Camera,
        backgroundName : string = "cave_wall") : void {

        const bmpWall : Bitmap | undefined = assets.getBitmap(backgroundName);
        if (bmpWall === undefined) {

            return;
        }

        const camPos : Vector = camera.getCorner();
        const shiftx : number = (camPos.x/4) % bmpWall.width;
        const shifty : number = (camPos.y/4) % bmpWall.height;

        const light : number = 255*(0.50 + 0.15*Math.sin(this.lightMagnitude));

        canvas.setColor(light, light, light);
        canvas.drawBitmap(bmpWall, Flip.None, 
            0, 0, shiftx, shifty, canvas.width, canvas.height, canvas.width, canvas.height);
        canvas.setColor();
    }


    private drawFrozenCaveBackground(canvas : Canvas, assets : Assets, camera : Camera) : void {

        this.drawCaveBackground(canvas, assets, camera, "frozen_cave_wall");
    }


    private drawCastleBackground(canvas : Canvas, assets : Assets, camera : Camera) : void {

        this.drawCaveBackground(canvas, assets, camera, "castle_wall");
    }


    private drawNightSky(canvas : Canvas, assets : Assets, camera : Camera) : void {

        canvas.clear(0, 0, 0);
        this.drawMoon(canvas, assets, 1);

        const shift : number = this.type == BackgroundType.NightSkyWithSnowSpecialShift ? -720: -240;

        this.drawClouds(canvas, assets, camera, CLOUD_COLOR_MOD_2, shift);
    }


    private drawNightSkyForest(canvas : Canvas, assets : Assets, camera : Camera) : void {

        canvas.clear(0, 36, 73);
        this.drawMoon(canvas, assets, 1);

        this.drawTrees(canvas, assets, camera, 0.40);
    }


    private drawSpecialSun(canvas : Canvas, assets : Assets,
        colors : RGBA[], sunIndex : number = 1, shifty : number = 0) : void {

        const RAY_COUNT : number = 12;
        const RAY_LENGTH : number = 576;

        canvas.clear(colors[0].r, colors[0].g, colors[0].b);

        const angleStep : number = Math.PI*2/RAY_COUNT;

        canvas.setColor(colors[1].r, colors[1].g, colors[1].b);
        for (let i : number = 0; i < RAY_COUNT; ++ i) {

            if (i % 2 == 0) {

                continue;
            }

            const angle : number = this.sunAngle + i*angleStep;

            canvas.transform.push();
            canvas.transform.translate(canvas.width/2, canvas.height/2 + shifty);
            canvas.transform.rotate(angle);
            canvas.transform.apply();

            // Note: to make the rays equal in size the width of a ray (which is
            // RAY_LENGTH/2 here) should be computed differently, but I'm just being
            // lazy here.
            canvas.fillEquiangularTriangle(0, -RAY_LENGTH/2, RAY_LENGTH/2, RAY_LENGTH);
            
            canvas.transform.pop();
        }
        canvas.transform.apply();
        canvas.setColor();

        const bmpSun : Bitmap | undefined  = assets.getBitmap("sun");
        if (bmpSun !== undefined) {

            canvas.drawBitmap(bmpSun, Flip.None, 
                canvas.width/2 - 32, canvas.height/2 - 32 + shifty, 
                sunIndex*64, 0, 64, 64);
        }
    }


    private drawSnowflakes(canvas : Canvas) : void {

        canvas.setColor(
            this.snowflakeColor.r, 
            this.snowflakeColor.g, 
            this.snowflakeColor.b, 
            this.snowflakeColor.a);
        for (const o of this.snowflakes) {

            o.draw(canvas);
        }
        canvas.setColor();
    }
    

    public initialize(camera : Camera) : void {

        this.snowflakes.length = 0;

        if (this.hasSnowflakes()) {

            this.initializeSnowflakes(camera);
        }
    }


    public update(camera : Camera, event : ProgramEvent) : void {

        switch (this.type) {

        case BackgroundType.Graveyard:

            this.updateClouds(1.0, event);
            break;

        case BackgroundType.Coast:

            this.updateCoast(event);
            break;

        case BackgroundType.CastleWall:
        case BackgroundType.FrozenCave:
        case BackgroundType.Cave:

            this.updateCave(event);
            break;

        case BackgroundType.NightSkyWithSnowSpecialShift:

            this.updateClouds(4.0, event);
            break;

        case BackgroundType.NightSkyWithSnow:
        case BackgroundType.NightSky:

            this.updateClouds(2.0, event);
            break;

        case BackgroundType.AltStarField:
        case BackgroundType.StarField:

            this.starfield?.update(event);
            break;

        case BackgroundType.FinalGraveyard:
        case BackgroundType.BurningSun:

            this.updateSpecialSun(event);
            this.updateClouds(4.0, event);
            break;

        default:
            break;
        }

        if (this.hasSnowflakes()) {

            for (const o of this.snowflakes) {

                o.cameraCheck(camera, event);
                o.update(event);
            }
        }
    }


    public draw(canvas : Canvas, assets : Assets, camera : Camera) : void {

        switch (this.type) {

        case BackgroundType.Graveyard:

            this.drawGraveyard(canvas, assets, camera);
            break;

        case BackgroundType.Coast:

            this.drawCoast(canvas, assets, camera);
            break;

        case BackgroundType.Forest:

            this.drawForestBackground(canvas, assets, camera);
            break;

        case BackgroundType.Cave:

            this.drawCaveBackground(canvas, assets, camera);
            break;

        case BackgroundType.NightSkyWithSnowSpecialShift:
        case BackgroundType.NightSkyWithSnow:
        case BackgroundType.NightSky:

            this.drawNightSky(canvas, assets, camera);
            break;

        case BackgroundType.StarField:
        case BackgroundType.AltStarField:

            canvas.clear(0, 0, 0);
            this.starfield?.draw(canvas);
            break;

        case BackgroundType.NightSkyWithForest:

            this.drawNightSkyForest(canvas, assets, camera);
            break;

        case BackgroundType.FrozenCave:

            this.drawFrozenCaveBackground(canvas, assets, camera);
            break;

        case BackgroundType.BurningSun:

            this.drawSpecialSun(canvas, assets, SPECIAL_SUN_COLORS_1, 1);
            break;

        case BackgroundType.CastleWall:

            this.drawCastleBackground(canvas, assets, camera);
            break;

        case BackgroundType.FinalGraveyard:

            this.drawSpecialSun(canvas, assets, SPECIAL_SUN_COLORS_2, 2, -32);
            this.drawClouds(canvas, assets, camera, CLOUD_COLOR_MOD_3, -192);
            break;

        default:

            canvas.clear(0, 0, 0);
            break;
        }
    }


    public postDraw(canvas : Canvas, assets : Assets) : void {

        if (this.snowflakeColor !== undefined) {
            
            this.drawSnowflakes(canvas);
        }
    } 


    public changeType(newType? : BackgroundType) : void {

        if (newType === undefined) {

            newType = this.oldType;
        }
        else {

            this.oldType = this.type;
        }

        this.type = newType;
        if (newType === BackgroundType.StarField) {

            this.starfield = new Starfield();
        }
        // Don't ask why is this needed here 'cause I have no idea
        else if (newType === BackgroundType.AltStarField) {

            this.starfield = new Starfield(36, 109, 219);
        }
        else {

            // Let the garbage collector get rid of the 
            // starfield
            this.starfield = undefined;
        }
    }
    

    public setCloudPosition(value : number) : void {

        this.cloudPos = Math.abs(value) % 1.0;
    } 


    public getCloudPosition = () : number => this.cloudPos;
}
