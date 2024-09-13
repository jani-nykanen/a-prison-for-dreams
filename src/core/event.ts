import { AudioPlayer } from "../audio/audioplayer.js";
import { Bitmap, Canvas, Flip, Renderer } from "../gfx/interface.js";
import { Assets } from "./assets.js";
import { Input } from "./input.js";
import { SceneManager } from "./scenemanager.js";
import { Transition } from "./transition.js";
import { Localization } from "./localization.js";
import { Rectangle } from "../math/rectangle.js";
import { Vector } from "../math/vector.js";
 

export class ProgramEvent {


    private localizations : Map<string, Localization>;
    private activeLocalization : Localization | undefined = undefined;

    private cursorSpriteArea : Rectangle;
    private cursorCenter : Vector;
    private cursorBitmap : Bitmap | undefined = undefined;

    private readonly renderer : Renderer;

    public readonly input : Input;
    public readonly audio : AudioPlayer;
    public readonly assets : Assets;
    public readonly transition : Transition;
    public readonly scenes : SceneManager;

    public readonly tick : number = 1.0;


    public get screenWidth() : number {

        return this.renderer.canvasWidth;
    }


    public get screenHeight() : number {

        return this.renderer.canvasHeight;
    }


    public get localization() : Localization | undefined {
        
        return this.activeLocalization;
    }


    constructor(ctx : AudioContext, renderer : Renderer) {

        this.input = new Input();
        this.audio = new AudioPlayer(ctx, 0.60);
        this.assets = new Assets(this.audio, renderer);
        this.transition = new Transition();
        this.scenes = new SceneManager();

        this.renderer = renderer;

        this.localizations = new Map<string, Localization> ();

        this.cursorSpriteArea = new Rectangle(0, 0, 16, 16);
        this.cursorCenter = new Vector();
    }


    public addLocalizationJSON(key : string, jsonString : string) : void {

        this.localizations.set(key, new Localization(jsonString));
    }


    public setActiveLocalization(key : string) : void {

        this.activeLocalization = this.localizations.get(key);
    }


    public cloneCanvasToBufferTexture(forceRedraw : boolean = false) : void {

        if (forceRedraw) {

            this.renderer.drawToCanvas((canvas : Canvas) : void => {

                this.scenes.redraw(canvas, this.assets);
            });
        }
        this.renderer.cloneCanvasToBufferBitmap();
    }


    public createBitmapFromPixelData(pixels : Uint8Array, width : number, height : number) : Bitmap {

        return this.renderer.createBitmapFromPixelData(pixels, width, height);
    }


    public setCursorSprite(bmp : Bitmap | undefined, 
        sx : number = 0, sy : number = 0, 
        sw : number = bmp?.width ?? 16, sh : number = bmp?.height ?? 16,
        centerx : number = 0.0, centery : number = 0.0) : void {

        this.cursorBitmap ??= bmp;
        this.cursorSpriteArea = new Rectangle(sx, sy, sw, sh);
        this.cursorCenter = new Vector(centerx, centery);
    }


    public drawCursor(canvas : Canvas) : void {

        if (this.cursorBitmap === undefined) {

            return;
        }

        this.input.mouse.computeScaledPosition(this);

        const p : Vector = this.input.mouse.getPosition();

        const dx : number = Math.round(p.x - this.cursorCenter.x);
        const dy : number = Math.round(p.y - this.cursorCenter.y);

        canvas.setColor();
        canvas.drawBitmap(this.cursorBitmap, Flip.None, dx, dy,
            this.cursorSpriteArea.x, this.cursorSpriteArea.y, 
            this.cursorSpriteArea.w, this.cursorSpriteArea.h);
    }
}
