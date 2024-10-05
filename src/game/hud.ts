import { Progress } from "./progress.js";
import { Align, Bitmap, Canvas, Effect, Flip, TransformTarget } from "../gfx/interface.js";
import { Assets } from "../core/assets.js";


export const drawHUD = (canvas : Canvas, assets : Assets, stats : Progress) : void => {

    canvas.moveTo();

    const bmpFontOutlines : Bitmap | undefined = assets.getBitmap("font_outlines");

    // Health
    const strHealth : string = String(stats.getHealth()) + "/" + String(stats.getMaxHealth());
    canvas.drawText(bmpFontOutlines, "H:" + strHealth, -1, -1, -7, 0);

    // Money
    canvas.drawText(bmpFontOutlines, "$" + String(stats.getMoney()), canvas.width, -1, -7, 0, Align.Right);

    // Ammo
    const strAmmo : string = String(stats.getBulletCount()) + "/" + String(stats.getMaxBulletCount());
    canvas.drawText(bmpFontOutlines, "A:" + strAmmo, -1, canvas.height - 14, -7, 0);
}
