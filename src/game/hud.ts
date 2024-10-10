import { Progress } from "./progress.js";
import { Align, Bitmap, Canvas, Effect, Flip, TransformTarget } from "../gfx/interface.js";
import { Assets } from "../core/assets.js";


const HEALTH_BAR_WIDTH : number = 64;
const HEALTH_BAR_HEIGHT : number = 13;

const HEALTH_BAR_COLORS : number[][] = [
    [182, 36, 0],
    [255, 73, 0],
    [255, 146, 109]
];
const HEALTH_BAR_PORTION_HEIGHTS : number[] = [
    HEALTH_BAR_HEIGHT - 2,
    HEALTH_BAR_HEIGHT - 7,
    HEALTH_BAR_HEIGHT - 10
];
const HEALTH_BAR_Y_OFF : number[] = [0, 1, 2];


const drawHealthBar = (canvas : Canvas, bmpFont : Bitmap | undefined, 
    dx : number, dy : number, stats : Progress) : void => {

    const foregroundWidth : number = Math.round(stats.getHealthBarPos()*(HEALTH_BAR_WIDTH - 2));

    canvas.setColor(255, 255, 255);
    canvas.fillRect(dx, dy, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);

    canvas.setColor(109, 109, 109);
    canvas.fillRect(dx + 1, dy + 1, HEALTH_BAR_WIDTH - 2, HEALTH_BAR_HEIGHT - 2);

    for (let i : number = 0; i < 3; ++ i) {

        const h : number = HEALTH_BAR_PORTION_HEIGHTS[i];

        canvas.setColor(...HEALTH_BAR_COLORS[i]);
        canvas.fillRect(dx + 1, dy + 1 + HEALTH_BAR_Y_OFF[i], foregroundWidth, h);
    }

    canvas.setColor();
}


export const drawHUD = (canvas : Canvas, assets : Assets, stats : Progress) : void => {

    canvas.moveTo();

    const bmpHUD : Bitmap | undefined = assets.getBitmap("hud");
    const bmpFontOutlines : Bitmap | undefined = assets.getBitmap("font_outlines");

    // Health
    let dx : number = 11;
    const dy : number = 3;
    const strHealth : string = String(stats.getHealth()) + "/" + String(stats.getMaxHealth());
    drawHealthBar(canvas, bmpFontOutlines, dx, dy, stats);
    canvas.drawBitmap(bmpHUD, Flip.None, 1, 1, 0, 0, 16, 16);

    canvas.drawText(bmpFontOutlines, strHealth, dx + HEALTH_BAR_WIDTH/2, 2, -7, 0, Align.Center);
    

    // Money
    const strMoney : string = "*" + String(stats.getMoney());
    dx = canvas.width - strMoney.length*9;
    canvas.drawText(bmpFontOutlines, strMoney, canvas.width, 1, -7, 0, Align.Right);
    canvas.drawBitmap(bmpHUD, Flip.None, dx - 21, 1, 16, 0, 16, 16);

    // Ammo
    const strAmmo : string = String(stats.getBulletCount()) + "/" + String(stats.getMaxBulletCount());
    canvas.drawText(bmpFontOutlines, strAmmo, 13, canvas.height - 16, -7, 0);
    canvas.drawBitmap(bmpHUD, Flip.None, 0, canvas.height - 17, 32, 0, 16, 16);
}
