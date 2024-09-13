import { Canvas } from "../gfx/interface.js";
import { RGBA } from "../math/rgba.js";


const DEFAULT_COLORS : RGBA[] = [ 
    new RGBA(255, 255, 255),
    new RGBA(0, 0, 0),
    new RGBA(0, 73, 146)
];


export const drawUIBox = (canvas : Canvas, 
    x : number, y : number, w : number, h : number, 
    colors : RGBA[] | undefined = undefined) : void => {

    colors = colors ?? DEFAULT_COLORS;

    for (let i = 0; i < colors.length; ++ i) {
        
        canvas.setColor(colors[i].r, colors[i].g, colors[i].b);
        canvas.fillRect(x + i, y + i, w - i*2, h - i*2);
    }

    canvas.setColor();
}
