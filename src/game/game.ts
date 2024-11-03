import { ProgramEvent } from "../core/event.js";
import { Scene, SceneParameter } from "../core/scene.js";
import { Align, Bitmap, Canvas, Effect, Flip, TransformTarget } from "../gfx/interface.js";
import { Stage } from "./stage.js";
import { Camera } from "./camera.js";
import { Tilemap } from "../tilemap/tilemap.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { ObjectManager } from "./objectmanager.js";
import { Assets } from "../core/assets.js";
import { Progress } from "./progress.js";
import { drawGameSavingIcon, drawHUD, GAME_SAVE_ANIMATION_TIME } from "./hud.js";
import { TransitionType } from "../core/transition.js";
import { RGBA } from "../math/rgba.js";
import { Pause } from "./pause.js";
import { InputState } from "../core/inputstate.js";
import { TextBox } from "../ui/textbox.js";
import { ConfirmationBox } from "../ui/confirmationbox.js";
import { MapTransitionCallback } from "./maptransition.js";
import { Pose } from "./player.js";
import { HintRenderer } from "./hintrenderer.js";
import { Cutscene } from "./cutscene.js";
import { AudioSample } from "../audio/sample.js";


const MAP_NAME_APPEAR_TIME : number = 90;
const MAP_NAME_FADE_TIME : number = 30;


export class Game implements Scene {


    private stage : Stage | undefined = undefined;
    private progress : Progress | undefined = undefined;
    private objects : ObjectManager = undefined;
    private camera : Camera;

    private pause : Pause;
    private dialogueBox : TextBox;
    private hints : HintRenderer;
    private cutscene : Cutscene;
    private initialDialogueActivated : boolean = false;

    private gameSaveTimer : number = 0;
    private gameSaveMode : number = 0;

    private fileIndex : number = 0;
    private tilesetIndex : number = 0;

    private transitionActive : boolean = false;

    private mapName : string = "";
    private mapNameTimer : number = 0;

    private mapTransition : MapTransitionCallback;

   
    constructor(event : ProgramEvent) { 

        this.camera = new Camera(0, 0, event);
        this.dialogueBox = new TextBox(true, 30, 5);
        this.pause = new Pause(event,
            (event : ProgramEvent) : void => this.objects?.killPlayer(event),
            (event : ProgramEvent) : boolean => this.progress.save(),
            (event : ProgramEvent) : void => this.quitToMainMenu(event)
        );

        this.hints = new HintRenderer();

        this.mapTransition = (
            mapName : string, 
            spawnPos : number, 
            pose : Pose,
            createPlayer : boolean,
            _event : ProgramEvent) : void => this.performMapTransition(mapName, spawnPos, pose, createPlayer, _event);

        this.cutscene = new Cutscene();
    }
    

    private triggerNPC(index : number, npcType : number, event : ProgramEvent) : void {

        this.dialogueBox.addText(event.localization?.getItem(`npc${index}`) ?? ["null"]);
        this.dialogueBox.activate(false, npcType);
    }


    private setCutscene(id : number, event : ProgramEvent) : void {

        if (!this.progress.hasWatchedCutscene(id)) {

            event.audio.pauseMusic();

            event.transition.freeze();
            this.cutscene.activate(id, 
            RGBA.invertUnsignedByte(event.transition.getColor()),
                event, (event : ProgramEvent) : void => {

                event.audio.resumeMusic();

                // Need to deactivate to get the proper frame to the
                // buffer for the wave effect.
                this.cutscene.deactivate();
                if (event.transition.getEffectType() == TransitionType.Waves) {

                    event.cloneCanvasToBufferTexture(true);
                }
                event.transition.unfreeze();
            });

            this.progress.markCutsceneWatched(id);
        }
    }


    private playSong(name : string, event : ProgramEvent) : void {

        const BASE_VOLUME : number = 0.50; // TODO: Pass as a parameter?

        const theme : AudioSample | undefined = event.assets.getSample(name);
        if (theme === undefined) {
            
            return;
        }

        event.audio.stopMusic();
        event.audio.fadeInMusic(theme, BASE_VOLUME, 1000);
    }


    private performMapTransition(mapName : string, spawnPos : number, 
        pose : Pose, createPlayer : boolean, event : ProgramEvent,
        save : boolean = true) : void {

        const baseMap : Tilemap | undefined = event.assets.getTilemap(mapName);
        if (baseMap === undefined) {

            throw new Error(`Required tilemap missing: ${mapName}`);
        }

        this.tilesetIndex = Number(baseMap.getProperty("tileset") ?? "0");

        const collisionMapName : string = `collisions_${this.tilesetIndex}`;
        const collisionMap : Tilemap | undefined = event.assets.getTilemap(collisionMapName);

        if (collisionMap === undefined) {

            throw new Error(`Required tilemap missing: ${collisionMapName}`);
        }

        this.progress.setAreaName(mapName);

        this.stage = new Stage(baseMap.getNumericProperty("background"), baseMap, collisionMap);
        // TODO: Maybe not recreate the whole object, but reset values etc.
        this.objects = new ObjectManager(
            this.progress, this.dialogueBox, this.hints,
            this.stage, this.camera,
            Number(baseMap.getProperty("npctype") ?? 0),
            this.mapTransition, spawnPos, pose, 
            createPlayer, event);
        this.objects.centerCamera(this.camera);
        this.limitCamera();

        this.stage.initializeBackground(this.camera);
        // Might help with portal transition?
        this.stage.update(this.camera, event);

        this.objects.initialCameraCheck(this.camera, event);

        if (save) {
            
            this.progress.save();

            if (spawnPos == 0) {
                // A lazy way to make sure that the animation is not triggered when 
                // loading the savefile was to put these inside if (save) check...
                const npcTriggered : number = Number(baseMap.getProperty("triggernpc") ?? -1);
                if (npcTriggered >= 0) {

                    const npcType : number = Number(baseMap.getProperty("npctype") ?? 0);
                    this.triggerNPC(npcTriggered, npcType, event);
                }
            }
        }

        this.hints.deactivate();

        // Start the background music
        const musicName : string | undefined = baseMap.getProperty("music");
        if (musicName !== undefined) {

            this.playSong(musicName, event);
        }

        // Set cutscene
        const cutsceneIndex : string | undefined = baseMap.getProperty("cutscene");
        if (cutsceneIndex !== undefined) {

            const id : number = Number(cutsceneIndex);
            this.setCutscene(id, event);
        }

        // Set area name
        this.mapName = baseMap.getProperty("name") ?? "null";
        this.mapNameTimer = MAP_NAME_APPEAR_TIME;
    }


    private setInitialDialogue(event : ProgramEvent) : void {

        this.dialogueBox.addText(event.localization?.getItem("wakeup") ?? ["null"]);
        // this.dialogueBox.activate(false, 0);
    }


    private activateInitialDialogue(event : ProgramEvent) : void {
        
        this.dialogueBox.activate(false, 1, (event : ProgramEvent) : void => {

            this.objects.initiateWakingUpAnimation(event);
        });
    }


    private reset(event : ProgramEvent) : void {

        this.progress.reset();
        this.objects.reset(this.progress, this.stage, this.camera, event);
        this.objects.centerCamera(this.camera);
    }


    private quitToMainMenu(event : ProgramEvent) : void {

        try {

            this.progress.save();
        }
        catch (e) {

            console.error("Not-so-fatal error: Failed to save progress: " + e["message"]);
        }

        event.transition.activate(true, TransitionType.Circle, 1.0/30.0, event,
            (event : ProgramEvent) : void => {

                event.scenes.changeScene("title", event);
            });
    }


    private startGameOverTransition(event : ProgramEvent) : void {

        event.transition.activate(true, TransitionType.Circle, 1.0/30.0,
            event,
            (event : ProgramEvent) : void => {

                this.reset(event);
                this.limitCamera();
                this.stage.initializeBackground(this.camera);
                
                event.transition.setCenter(this.objects.getRelativePlayerPosition(this.stage, this.camera));
            },
            new RGBA(0, 0, 0), this.objects.getRelativePlayerPosition(this.stage, this.camera));
    }
    

    private limitCamera() : void {

        this.camera.limit(0, this.stage.width*TILE_WIDTH, null, this.stage.height*TILE_HEIGHT);
    }


    private drawDialogueBox(canvas : Canvas, assets : Assets) : void {

        if (this.transitionActive) {

            return;
        }

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
        
        this.fileIndex = typeof(param) == "number" ? param : this.fileIndex;

        this.progress = new Progress(this.fileIndex);
        const fileLoaded : boolean = this.progress.loadGame(this.fileIndex);

        this.performMapTransition(this.progress.getAreaName(), 0, 
            fileLoaded ? Pose.None : Pose.Sit, !fileLoaded, event, !fileLoaded);

        event.transition.setCenter(this.objects.getRelativePlayerPosition(this.stage, this.camera));
        if (!fileLoaded) {

            event.transition.changeSpeed(1.0/90.0);            
            this.setInitialDialogue(event);
        }
        this.initialDialogueActivated = fileLoaded;

        this.gameSaveMode = 0;
        this.gameSaveTimer = 0;
    }


    public update(event : ProgramEvent) : void {

        if (this.cutscene.isActive()) {

            this.cutscene.update(event);
            return;
        }

        if (this.mapNameTimer > 0) {

            this.mapNameTimer -= event.tick;
        }

        this.transitionActive = event.transition.isActive();

        if (this.progress?.wasGameSaved()) {

            this.gameSaveMode = this.progress?.wasGameSavingSuccessful() ? 1 : 2;
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

        if (!event.transition.isActive() ||
            event.transition.getEffectType() != TransitionType.Waves) {

            this.stage?.update(this.camera, event);
        }

        if (event.transition.isActive()) {

            this.objects?.initialCameraCheck(this.camera, event);
            this.objects?.animateNPCs(this.camera, event);
            return;
        }

        if (this.dialogueBox.isActive()) {

            this.mapNameTimer = 0;

            this.objects?.animateNPCs(this.camera, event);
            this.dialogueBox.update(event);
            return;
        }

        if (!this.initialDialogueActivated) {

            this.initialDialogueActivated = true;
            this.activateInitialDialogue(event);
            return;
        }

        if (event.input.getAction("pause") == InputState.Pressed) {

            this.pause.activate();
            event.audio.playSample(event.assets.getSample("pause"), 0.80);
            return;
        }

        this.objects?.update(this.camera, this.stage!, this.hints, event);
        if (this.objects?.hasPlayerDied()) {

            this.startGameOverTransition(event);
        }
        this.progress?.update(event);

        this.camera.update(event);
        this.limitCamera();
    }


    public redraw(canvas : Canvas, assets : Assets, isCloningToBuffer : boolean) : void {

        canvas.moveTo();
        // canvas.clear(109, 182, 255);
        canvas.setColor();

        canvas.transform.setTarget(TransformTarget.Camera);
        canvas.transform.view(canvas.width, canvas.height);

        canvas.transform.setTarget(TransformTarget.Model);
        canvas.transform.loadIdentity();

        if (this.cutscene.isActive()) {

            return;
        }

        this.stage.drawBackground(canvas, assets, this.camera);

        this.camera.apply(canvas);
        this.stage?.draw(canvas, assets, this.tilesetIndex, this.camera);
        this.objects?.draw(canvas, assets);
        this.stage?.drawForeground(canvas, assets, this.camera);

        canvas.transform.setTarget(TransformTarget.Model);
        canvas.transform.loadIdentity();
        canvas.transform.apply();
        canvas.moveTo();

        if (!isCloningToBuffer &&
            (this.initialDialogueActivated && !this.dialogueBox.isActive())) { // ||
            // (this.dialogueBox.isActive() && this.transitionActive) ) {
            
            drawHUD(canvas, assets, this.progress!);
        }

        this.pause.draw(canvas, assets);
        this.drawDialogueBox(canvas, assets);
/*
        if (this.gameSaveTimer > 0) {

            drawGameSavingIcon(canvas, assets, this.gameSaveTimer, this.gameSaveMode == 1);
        }
*/
        if (!this.pause.isActive() && !this.dialogueBox.isActive()) {
        
            this.hints.draw(canvas, assets);
        }

    }


    public postDraw(canvas : Canvas, assets : Assets) : void {

        canvas.moveTo();
        canvas.setColor();

        canvas.transform.setTarget(TransformTarget.Camera);
        canvas.transform.view(canvas.width, canvas.height);

        canvas.transform.setTarget(TransformTarget.Model);
        canvas.transform.loadIdentity();

        if (this.cutscene.isActive()) {

            this.cutscene.draw(canvas, assets);
            return;
        }

        // TODO: Split to own function
        if (!this.pause.isActive() && this.mapNameTimer > 0) {

            const bmpFontOutlines : Bitmap | undefined = assets.getBitmap("font_outlines");
            let alpha : number = 1.0;
            if (this.mapNameTimer <= MAP_NAME_FADE_TIME) {

                alpha = this.mapNameTimer/MAP_NAME_FADE_TIME;
            }

            canvas.setAlpha(alpha);
            canvas.drawText(bmpFontOutlines, this.mapName,
                canvas.width/2, canvas.height/2 - 8, -8, 0, Align.Center);
            canvas.setAlpha();
        }

        canvas.setColor();
        if (this.gameSaveTimer > 0) {

            drawGameSavingIcon(canvas, assets, this.gameSaveTimer, this.gameSaveMode == 1);
        }
    }


    public dispose() : SceneParameter {
        
        return undefined;
    }
}
