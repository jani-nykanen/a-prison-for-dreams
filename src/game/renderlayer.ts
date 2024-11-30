import { Assets } from "../core/assets.js";
import { ProgramEvent } from "../core/event.js";
import { Canvas, Bitmap, Flip } from "../gfx/interface.js";
import { clamp } from "../math/utility.js";
import { Vector } from "../math/vector.js";
import { Tilemap } from "../tilemap/tilemap.js";
import { Camera } from "./camera.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";


const COLOR_BLOCKS : number[][] = [
    [241, 244],
    [242, 245],
    [243, 246]
];


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

/*
    private getTile(layer : number, x : number, y : number, def : number = 0) : number {

        if (layer < 0 || layer >= this.layers.length ||
            x < 0 || y < 0 || x >= this.width || y >= this.height) {

            return def;
        }
        return this.layers[layer][y*this.width + x];
    }
*/


    private drawLayer(canvas : Canvas, bmp : Bitmap,
        layer : number, startx : number, starty : number, endx : number, endy : number) : void {

        canvas.beginSpriteBatching(bmp);

        for (let y = starty; y <= endy; ++ y) {

            for (let x = startx; x <= endx; ++ x) {

                const tx : number = clamp(x, 0, this.width - 1);
                const ty : number = clamp(y, 0, this.height - 1);

                const tileID : number = this.layers[layer][ty*this.width + tx] // this.getTile(layer, x, y);
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


    public draw(canvas : Canvas, tileset : Bitmap | undefined, 
        camera : Camera, topLayerOpacity : number = 1.0) : void {

        const MIN_OPACITY : number = 0.001;
        const CAMERA_MARGIN : number = 1;   

        const cameraPos : Vector = camera.getCorner();

        const startx : number = ((cameraPos.x/TILE_WIDTH) | 0) - CAMERA_MARGIN;
        const starty : number = ((cameraPos.y/TILE_HEIGHT) | 0) - CAMERA_MARGIN;

        const endx : number = startx + ((camera.width/TILE_WIDTH) | 0) + CAMERA_MARGIN*2;
        const endy : number = starty + ((camera.height/TILE_HEIGHT) | 0) + CAMERA_MARGIN*2;

        for (let i : number = 0; i < this.layers.length; ++ i) {

            if (i == 2) {

                if (topLayerOpacity <= MIN_OPACITY) {

                    continue;
                }
                else if (topLayerOpacity < 1.0) {

                    canvas.setAlpha(topLayerOpacity);
                }
            }
            this.drawLayer(canvas, tileset, i, startx, starty, endx, endy);
        
            if (topLayerOpacity < 1.0) {

                canvas.setAlpha();
            }
        }
    }


    public toggleColorBlocks(index : number) : Map<string, number> | undefined {

        if (index < 0 || index >= 3) {

            return undefined;
        }

        const output : Map<string, number> = new Map<string, number> ();
        for (const l of this.layers) {

            for (const k in l) {

                const tile : number = l[k];
                if (tile == COLOR_BLOCKS[index][0]) {

                    l[k] = COLOR_BLOCKS[index][1];
                    output.set(k, l[k]);
                }
                else if (tile == COLOR_BLOCKS[index][1]) {

                    l[k] = COLOR_BLOCKS[index][0];
                    output.set(k, l[k]);
                }
            }
        }
        return output;
    }
}