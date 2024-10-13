import { ProgramEvent } from "../core/event.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { Align, Bitmap, Canvas, Effect, Flip, TransformTarget } from "../gfx/interface.js";
import { Stage } from "./stage.js";
import { Camera } from "./camera.js";
import { Tilemap } from "../tilemap/tilemap.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { ObjectManager } from "./objectmanager.js";
import { Assets } from "../core/assets.js";
import { LOCAL_STORAGE_KEY, Progress } from "./progress.js";
import { drawGameSavingIcon, drawHUD, GAME_SAVE_ANIMATION_TIME } from "./hud.js";
import { TransitionType } from "../core/transition.js";
import { RGBA } from "../math/rgba.js";
import { Pause } from "./pause.js";
import { InputState } from "../core/inputstate.js";
import { TextBox } from "../ui/textbox.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";


export class Game implements Scene {


    private stage : Stage;
    private camera : Camera;
    private progress : Progress;
    private objects : ObjectManager;

    private pause : Pause;
    private dialogueBox : TextBox;

    private gameSaveTimer : number = 0;
    private gameSaveMode : number = 0;


    constructor(event : ProgramEvent) { 

        const baseMap : Tilemap | undefined = event.assets.getTilemap("coast");
        const collisionMap : Tilemap | undefined = event.assets.getTilemap("collisions_1");

        if (baseMap === undefined || collisionMap === undefined) {

            throw "Required tilemaps missing!";
        }

        this.stage = new Stage(baseMap, collisionMap);
        this.camera = new Camera(0, 0, event);
        this.progress = new Progress();

        this.dialogueBox = new TextBox(true, 30, 5);
        this.objects = new ObjectManager(
            this.progress, this.dialogueBox, 
            this.stage, this.camera, event);
        this.objects.centerCamera(this.camera);

        this.pause = new Pause(event,
            (event : ProgramEvent) : void => this.objects.killPlayer(event),
            (event : ProgramEvent) : boolean => this.progress.save(LOCAL_STORAGE_KEY),
            (event : ProgramEvent) : void => this.quitToMainMenu(event)
        );
    }
    


    private reset(event : ProgramEvent) : void {

        this.progress.reset();
        this.objects.reset(this.progress, this.stage, this.camera, event);

        this.objects.centerCamera(this.camera);
    }


    private quitToMainMenu(event : ProgramEvent) : void {

        try {

            this.progress.save(LOCAL_STORAGE_KEY);
        }
        catch (e) {

            console.error("Not-so-fatal error: Failed to save progress: " + e["message"]);
        }

        throw new Error("Nope, not yet.");
    }


    private startGameOverTransition(event : ProgramEvent) : void {

        event.transition.activate(true, TransitionType.Circle, 1.0/30.0,
            event,
            (event : ProgramEvent) : void => {

                this.reset(event);
                this.limitCamera();
                
                event.transition.setCenter(this.objects.getRelativePlayerPosition(this.stage, this.camera));
            },
            new RGBA(0, 0, 0), this.objects.getRelativePlayerPosition(this.stage, this.camera));
    }
    

    private limitCamera() : void {

        this.camera.limit(0, this.stage.width*TILE_WIDTH, null, this.stage.height*TILE_HEIGHT);
    }


    private drawDialogueBox(canvas : Canvas, assets : Assets) : void {

        const boxHeight : number = this.dialogueBox.getHeight()*10;

        let dy : number = 0;
        if (this.objects.getRelativePlayerPosition(this.stage, this.camera).y > this.camera.height/2 + boxHeight/2) {

            dy = -canvas.height/2 + boxHeight/2 + 8;
        }
        else {

            dy = canvas.height/2 - boxHeight/2 - 10;
        }

        this.dialogueBox.draw(canvas, assets,  0, dy);
    }


    public init(param : SceneParameter, event : ProgramEvent) : void {

        // ...
    }


    public update(event : ProgramEvent) : void {

        if (this.progress.wasGameSaved()) {

            this.gameSaveMode = this.progress.wasGameSavingSuccessful() ? 1 : 2;
            this.gameSaveTimer = GAME_SAVE_ANIMATION_TIME;
        }

        if (this.gameSaveTimer > 0) {

            this.gameSaveTimer -= event.tick;
            if (this.gameSaveTimer <= 0) {

                this.gameSaveMode = 0;
            }
        }

        if (this.pause.isActive() && !event.transition.isActive()) {
            
            this.pause.update(event);
            return;
        }

        this.stage.update(event);
        
        if (this.dialogueBox.isActive()) {

            this.dialogueBox.update(event);
            return;
        }

        if (event.transition.isActive()) {

            this.objects.initialCameraCheck(this.camera, event);
            return;
        }

        if (event.input.getAction("pause") == InputState.Pressed) {

            this.pause.activate();
            return;
        }

        this.objects.update(this.camera, this.stage, event);
        if (this.objects.hasPlayerDied()) {

            this.startGameOverTransition(event);
        }
        this.progress.update(event);

        this.camera.update(event);
        this.limitCamera();
    }


    public redraw(canvas : Canvas, assets : Assets) : void {

        canvas.moveTo();
        // canvas.clear(109, 182, 255);
        canvas.setColor();

        canvas.transform.setTarget(TransformTarget.Camera);
        canvas.transform.view(canvas.width, canvas.height);

        canvas.transform.setTarget(TransformTarget.Model);
        canvas.transform.loadIdentity();

        this.stage.drawBackground(canvas, assets, this.camera);

        this.camera.apply(canvas);
        this.stage.draw(canvas, assets, this.camera);
        this.objects.draw(canvas, assets);
        this.stage.drawForeground(canvas, assets, this.camera);

        canvas.transform.setTarget(TransformTarget.Model);
        canvas.transform.loadIdentity();
        canvas.transform.apply();
        canvas.moveTo();

        drawHUD(canvas, assets, this.progress);

        this.pause.draw(canvas, assets);
        this.drawDialogueBox(canvas, assets);

        if (this.gameSaveTimer > 0) {

            drawGameSavingIcon(canvas, assets, this.gameSaveTimer, this.gameSaveMode == 1);
        }

    }


    public dispose() : SceneParameter {
        
        return undefined;
    }
}
