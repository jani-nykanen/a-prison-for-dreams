import { Progress } from "./progress.js";
import { Align, Bitmap, Canvas, Effect, Flip, TransformTarget } from "../gfx/interface.js";
import { Assets } from "../core/assets.js";
import { Item } from "./items.js";
import { LOCKED_HUGE_DOOR_INDEX } from "./interactables/portal.js";


export const GAME_SAVE_ANIMATION_TIME : number = 120;
export const GAME_SAVE_ICON_APPEAR_TIME : number = 15;


const HEALTH_BAR_WIDTH : number = 64;
const HEALTH_BAR_HEIGHT : number = 10;

const HEALTH_BAR_COLORS : number[][] = [
    [182, 36, 0],
    [255, 73, 0],
];
const HEALTH_BAR_PORTION_HEIGHTS : number[] = [
    HEALTH_BAR_HEIGHT - 4,
    HEALTH_BAR_HEIGHT - 7,
];
const HEALTH_BAR_Y_OFF : number[] = [0, 1, 2];


const drawHealthBar = (canvas : Canvas, bmpFont : Bitmap | undefined, 
    dx : number, dy : number, stats : Progress) : void => {

    const foregroundWidth : number = Math.round(stats.getHealthBarPos()*(HEALTH_BAR_WIDTH - 4));

    canvas.setColor(255, 255, 255);
    canvas.fillRect(dx, dy, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT);

    canvas.setColor(0, 0, 0);
    canvas.fillRect(dx + 1, dy + 1, HEALTH_BAR_WIDTH - 2, HEALTH_BAR_HEIGHT - 2);

    canvas.setColor(109, 109, 109);
    canvas.fillRect(dx + 2, dy + 2, HEALTH_BAR_WIDTH - 4, HEALTH_BAR_HEIGHT - 4);

    for (let i : number = 0; i < HEALTH_BAR_COLORS.length; ++ i) {

        const h : number = HEALTH_BAR_PORTION_HEIGHTS[i];

        canvas.setColor(...HEALTH_BAR_COLORS[i]);
        canvas.fillRect(dx + 2, dy + 2 + HEALTH_BAR_Y_OFF[i], foregroundWidth, h);
    }

    canvas.setColor();
}


export const drawHUD = (canvas : Canvas, assets : Assets, stats : Progress) : void => {

    canvas.moveTo();

    const bmpHUD : Bitmap | undefined = assets.getBitmap("hud");
    const bmpFontOutlines : Bitmap | undefined = assets.getBitmap("font_outlines");

    // Health
    let dx : number = 11;
    const strHealth : string = String(stats.getHealth()) + "/" + String(stats.getMaxHealth());
    drawHealthBar(canvas, bmpFontOutlines, dx, 5, stats);
    canvas.drawBitmap(bmpHUD, Flip.None, 1, 1, 0, 0, 16, 16);
    canvas.drawText(bmpFontOutlines, strHealth, dx + HEALTH_BAR_WIDTH/2, 0, -7, 0, Align.Center);
    
    // Money
    const strMoney : string = "*" + String(stats.getMoney());
    dx = canvas.width - strMoney.length*9;
    canvas.drawText(bmpFontOutlines, strMoney, canvas.width, 1, -7, 0, Align.Right);
    canvas.drawBitmap(bmpHUD, Flip.None, dx - 21, 1, 16, 0, 16, 16);

    // Ammo
    if (stats.hasItem(Item.Gun)) {
        
        const strAmmo : string = String(stats.getBulletCount()) + "/" + String(stats.getMaxBulletCount());
        canvas.drawText(bmpFontOutlines, strAmmo, 13, canvas.height - 16, -7, 0);
        canvas.drawBitmap(bmpHUD, Flip.None, 0, canvas.height - 17, 32, 0, 16, 16);
    }

    // Orbs 

    // Do not draw if the huge door has been opened
    // (i.e the orbs have been "consumed")
    if (stats.isDoorOpen(LOCKED_HUGE_DOOR_INDEX)) {

        return;
    }

    const orbCount : number = stats.getOrbCount();
    if (orbCount > 0) {

        const strOrbs : string = `*${orbCount}`;

        const dy : number = 14;
        dx = canvas.width - strOrbs.length*9;

        canvas.drawText(bmpFontOutlines, strOrbs, canvas.width, dy, -7, 0, Align.Right);
        canvas.drawBitmap(bmpHUD, Flip.None, dx - 21, dy, 64, 0, 16, 16);
    }
}


export const drawGameSavingIcon = (canvas : Canvas, assets : Assets, timer : number, success : boolean) : void => {

    const XOFF : number = 17;
    const YOFF : number = 17;
    const FRAME_TIME : number = 6;

    const bmpHUD : Bitmap | undefined = assets.getBitmap("hud");

    if (!success) {

        if (Math.floor(timer/8) % 2 == 0) {

            return;
        }

        canvas.drawBitmap(bmpHUD, Flip.None, canvas.width - XOFF - 12, canvas.height - YOFF, 0, 16, 16, 16);
        canvas.drawBitmap(bmpHUD, Flip.None, canvas.width - XOFF, canvas.height - YOFF, 48, 0, 16, 16);

        return;
    }

    const initialTime : number = GAME_SAVE_ANIMATION_TIME - GAME_SAVE_ICON_APPEAR_TIME;

    let t : number = 1.0;
    if (timer >= GAME_SAVE_ANIMATION_TIME - GAME_SAVE_ICON_APPEAR_TIME) {

        t = 1.0 - (timer - initialTime)/GAME_SAVE_ICON_APPEAR_TIME;
    }
    else if (timer <= GAME_SAVE_ICON_APPEAR_TIME) {

        t = timer/GAME_SAVE_ICON_APPEAR_TIME;
    }

    const frame : number = Math.floor(timer/FRAME_TIME) % 8;
    
    const dx : number = canvas.width - XOFF*t;
    const dy : number = canvas.height - YOFF;

    canvas.drawBitmap(bmpHUD, Flip.None, dx, dy, frame*16, 16, 16, 16);
}
