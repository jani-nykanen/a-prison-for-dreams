import { Progress } from "./progress.js";
import { Align, Bitmap, Canvas, Effect, Flip, TransformTarget } from "../gfx/interface.js";
import { Assets } from "../core/assets.js";


export const drawHUD = (canvas : Canvas, assets : Assets, stats : Progress) : void => {

    canvas.moveTo();

    const bmpHUD : Bitmap | undefined = assets.getBitmap("hud");
    const bmpFontOutlines : Bitmap | undefined = assets.getBitmap("font_outlines");

    // Health
    const strHealth : string = String(stats.getHealth()) + "/" + String(stats.getMaxHealth());
    canvas.drawText(bmpFontOutlines, strHealth, 14, 1, -7, 0);
    canvas.drawBitmap(bmpHUD, Flip.None, 1, 1, 0, 0, 16, 16);

    // Money
    const strMoney : string = "*" + String(stats.getMoney());
    const dx : number = canvas.width - strMoney.length*9;
    canvas.drawText(bmpFontOutlines, strMoney, canvas.width, 1, -7, 0, Align.Right);
    canvas.drawBitmap(bmpHUD, Flip.None, dx - 21, 1, 16, 0, 16, 16);

    // Ammo
    const strAmmo : string = String(stats.getBulletCount()) + "/" + String(stats.getMaxBulletCount());
    canvas.drawText(bmpFontOutlines, strAmmo, 13, canvas.height - 16, -7, 0);
    canvas.drawBitmap(bmpHUD, Flip.None, 0, canvas.height - 17, 32, 0, 16, 16);
}
