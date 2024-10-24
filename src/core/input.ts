import { InputState } from "./inputstate.js";
import { Keyboard } from "./keyboard.js";
import { GamePad } from "./gamepad.js";
import { Vector } from "../math/vector.js";
import { Mouse } from "./mouse.js";
import { ProgramEvent } from "./event.js";


const INPUT_DIRECTION_DEADZONE : number = 0.1;


class InputAction {


    public keys : Array<string>;
    public gamepadButtons : Array<number>;
    public mouseButtons : Array<number>;

    constructor(keys : Array<string>, gamepadButtons : Array<number>, mouseButtons : Array<number>) {

        this.keys = Array.from(keys);
        this.gamepadButtons = Array.from(gamepadButtons);
        this.mouseButtons = Array.from(mouseButtons);
    }
}


export class Input {


    private actions : Map<string, InputAction>;

    private oldStick : Vector;
    private vstick : Vector;
    private stickDelta : Vector;

    private anyPressed : boolean = false;

    public readonly keyboard : Keyboard;
    public readonly gamepad : GamePad;
    public readonly mouse : Mouse;


    public get stick() : Vector {

        return this.vstick.clone();
    }


    constructor() {

        this.actions = new Map<string, InputAction> ();

        this.vstick = new Vector();
        this.oldStick = new Vector();
        this.stickDelta = new Vector();

        this.keyboard = new Keyboard();
        this.gamepad = new GamePad();
        this.mouse = new Mouse();

        // These are used to determine the player direction
        // more easily when using a keyboard
        this.addAction("right", ["ArrowRight"], [15]);
        this.addAction("up",    ["ArrowUp"],    [12]);
        this.addAction("left",  ["ArrowLeft"],  [14]);
        this.addAction("down",  ["ArrowDown"],  [13]);
    }


    public addAction(name : string, 
        keys : Array<string>, 
        gamepadButtons : Array<number> | undefined = undefined, 
        mouseButtons : Array<number> | undefined = undefined,
        prevent : boolean = true) : void {

        this.actions.set(name, new InputAction(keys, gamepadButtons ?? [], mouseButtons ?? []));
        if (prevent) {

            for (const k of keys) {

                this.keyboard.preventKey(k);
            }
        }
    }


    public preUpdate() : void {

        const DEADZONE : number = 0.25;

        this.oldStick = this.vstick.clone();
        this.vstick.zeros();

        let stick : Vector = new Vector();

        // TODO: Replace the below with calls "getAction("left")" etc.

        if ((this.keyboard.getKeyState("ArrowLeft") & InputState.DownOrPressed) == 1 ||
            (this.keyboard.getKeyState("KeyA") & InputState.DownOrPressed) == 1 ||
            (this.gamepad.getButtonState(14) & InputState.DownOrPressed) == 1) {

            stick.x = -1;
        }
        else if ((this.keyboard.getKeyState("ArrowRight") & InputState.DownOrPressed) == 1  ||
            (this.keyboard.getKeyState("KeyD") & InputState.DownOrPressed) == 1 ||
            (this.gamepad.getButtonState(15) & InputState.DownOrPressed) == 1) {

            stick.x = 1;
        }
        if ((this.keyboard.getKeyState("ArrowUp") & InputState.DownOrPressed) == 1  ||
            (this.keyboard.getKeyState("KeyW") & InputState.DownOrPressed) == 1 ||
            (this.gamepad.getButtonState(12) & InputState.DownOrPressed) == 1) {

            stick.y = -1;
        }
        else if ((this.keyboard.getKeyState("ArrowDown") & InputState.DownOrPressed) == 1  ||
            (this.keyboard.getKeyState("KeyS") & InputState.DownOrPressed) == 1 ||
            (this.gamepad.getButtonState(13) & InputState.DownOrPressed) == 1) {

            stick.y = 1;
        }

        if (stick.length < DEADZONE) {

            stick = this.gamepad.stick;
        }
        
        if (stick.length >= DEADZONE) {

            this.vstick = stick;
        }

        this.stickDelta.x = this.vstick.x - this.oldStick.x;
        this.stickDelta.y = this.vstick.y - this.oldStick.y;

        this.anyPressed = this.keyboard.isAnyPressed() || this.gamepad.isAnyPressed() || this.mouse.isAnyPressed();
    }


    public update(event : ProgramEvent) : void {

        this.keyboard.update();
        this.gamepad.update();
        this.mouse.update(event);
    }


    public getAction(name : string) : InputState {

        const action : InputAction | undefined = this.actions.get(name);
        if (action === undefined)
            return InputState.Up;

        for (let k of action.keys) {

            const state : InputState = this.keyboard.getKeyState(k);
            if (state != InputState.Up)
                return state;
        }

        for (let b of action.gamepadButtons) {

            const state : InputState = this.gamepad.getButtonState(b);
            if (state != InputState.Up)
                return state;
        }

        for (let b of action.mouseButtons) {

            const state : InputState = this.mouse.getButtonState(b);
            if (state != InputState.Up)
                return state;
        }

        return InputState.Up;
    }


    public upPress() : boolean {

        return this.stick.y < 0 && 
            this.oldStick.y >= -INPUT_DIRECTION_DEADZONE &&
            this.stickDelta.y < -INPUT_DIRECTION_DEADZONE;
    }


    public downPress() : boolean {

        return this.stick.y > 0 && 
            this.oldStick.y <= INPUT_DIRECTION_DEADZONE &&
            this.stickDelta.y > INPUT_DIRECTION_DEADZONE;
    }


    public leftPress() : boolean {

        return this.stick.x < 0 && 
            this.oldStick.x >= -INPUT_DIRECTION_DEADZONE &&
            this.stickDelta.x < -INPUT_DIRECTION_DEADZONE;
    }

    
    public rightPress() : boolean {

        return this.stick.x > 0 && 
            this.oldStick.x <= INPUT_DIRECTION_DEADZONE &&
            this.stickDelta.x > INPUT_DIRECTION_DEADZONE;
    }


    public isAnyPressed = () : boolean => this.anyPressed;
}
