import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { Vector } from "../math/vector.js";
import { Tilemap } from "../tilemap/tilemap.js";
import { Camera } from "./camera.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";



export class RenderLayer {


    private layers : number[][];

    public readonly width : number;
    public readonly height : number;


    constructor(baseMap : Tilemap) {

        const LAYER_NAMES : string[] = ["bottom", "middle", "top"];

        this.width = baseMap.width;
        this.height = baseMap.height;

        this.layers = new Array<number[]> (3);
        for (let i = 0; i < LAYER_NAMES.length; ++ i) {

            this.layers[i] = baseMap.cloneLayer(LAYER_NAMES[i]) ?? [];
        }

    }


    private getTile(layer : number, x : number, y : number, def : number = 0) : number {

        if (layer < 0 || layer >= this.layers.length ||
            x < 0 || y < 0 || x >= this.width || y >= this.height) {

            return def;
        }
        return this.layers[layer][y*this.width + x];
    }


    private drawLayer(canvas : Canvas, bmp : Bitmap,
        layer : number, startx : number, starty : number, endx : number, endy : number) : void {

        canvas.beginSpriteBatching(bmp);

        for (let y = starty; y <= endy; ++ y) {

            for (let x = startx; x <= endx; ++ x) {

                const tileID : number = this.getTile(layer, x, y);
                if (tileID == 0) {

                    continue;
                }

                const sx : number = (tileID - 1) % 16;
                const sy : number = ((tileID - 1)/16) | 0;

                canvas.drawBitmap(bmp, Flip.None, 
                    x*TILE_WIDTH, y*TILE_HEIGHT , 
                    sx*TILE_WIDTH, sy*TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
            }
        }

        canvas.endSpriteBatching();
        canvas.drawSpriteBatch();
    }


    public draw(canvas : Canvas, assets : Assets, camera : Camera) : void {

        const CAMERA_MARGIN : number = 1;

        // TODO: Pass tileset index in the draw function
        const bmpTileset : Bitmap = assets.getBitmap("tileset_1");
        if (bmpTileset === undefined) {

            return;
        }

        const cameraPos : Vector = camera.getCorner();

        const startx : number = ((cameraPos.x/TILE_WIDTH) | 0) - CAMERA_MARGIN;
        const starty : number = ((cameraPos.y/TILE_HEIGHT) | 0) - CAMERA_MARGIN;

        const endx : number = startx + ((camera.width/TILE_WIDTH) | 0) + CAMERA_MARGIN*2;
        const endy : number = starty + ((camera.height/TILE_HEIGHT) | 0) + CAMERA_MARGIN*2;

        for (let i = 0; i < this.layers.length; ++ i) {

            this.drawLayer(canvas, bmpTileset, i, startx, starty, endx, endy);
        }
    }
}