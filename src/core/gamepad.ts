import { InputState } from "./inputstate.js";
import { Vector } from "../math/vector.js";



// Gamepad was taken...
export class GamePad {


    // TODO: Support for more sticks?
    private leftStick : Vector;

    private index : number | undefined = undefined;
    private anyPressed : boolean = false;

    private activePad : Gamepad | null | undefined = undefined;
    private buttonStates : boolean[];
    private oldButtonStates : boolean[];

    private buttons : Map<number, InputState>;


    public get stick() : Vector {

        return this.leftStick.clone();
    }


    constructor() {

        this.leftStick = new Vector();
        this.buttons = new Map<number, InputState> ();

        this.oldButtonStates = new Array<boolean> ();
        this.buttonStates = new Array<boolean> ();

        window.addEventListener("gamepadconnected", (ev : GamepadEvent) => {

            if (this.index === undefined) {

                console.log("Gamepad with index " + 
                    String(ev["gamepad"]["index"]) + 
                    " connected.");
            }
            else {

                console.log("Gamepad with index " + 
                        String(ev["gamepad"].index) + 
                        " connected but ignored since one gamepad is already connected.");
                return;
            }

            const pad : Gamepad | null = navigator.getGamepads()[ev["gamepad"]["index"]] ?? null;
            this.index = ev["gamepad"]["index"];

            this.activePad = pad;

            this.checkButtons();
        });
    }


    private updateButtons() : void {

        if (this.activePad === null || this.activePad === undefined) {
            
            return;
        }

        for (const k of this.buttons.keys()) {

            if (this.buttons.get(k) === InputState.Pressed) {

                this.buttons.set(k, InputState.Down);
            }
            else if (this.buttons.get(k) === InputState.Released) {

                this.buttons.set(k, InputState.Up);
            }
        }
    }


    private updateStick() : void {
        
        const DEADZONE : number = 0.25;

        if (this.activePad === null || this.activePad === undefined) {
            
            return;
        }

        let noLeftStick : boolean = true;
            
        this.leftStick.x = 0;
        this.leftStick.y = 0;

        if (Math.abs(this.activePad.axes[0]) >= DEADZONE) {

            this.leftStick.x = this.activePad.axes[0];
            noLeftStick = false;
        }
        if (Math.abs(this.activePad.axes[1]) >= DEADZONE) {

            this.leftStick.y = this.activePad.axes[1];
            noLeftStick = false;
        }

        // On Firefox dpad is considered
        // axes, not buttons
        if (this.activePad.axes.length >= 8 && noLeftStick) {

            if (Math.abs(this.activePad.axes[6]) >= DEADZONE) {

                this.leftStick.x = this.activePad.axes[6];
            }
            if (Math.abs(this.activePad.axes[7]) >= DEADZONE) {
                
                this.leftStick.y = this.activePad.axes[7];
            }
        }
    }


    private checkButtons() : void {

        for (const k in this.activePad?.buttons) {
            
            const oldState : boolean = (this.oldButtonStates[k] = this.buttonStates[k] ?? false);
            const newState : boolean = (this.buttonStates[k] = this.activePad?.buttons[k].pressed ?? false);

            if (oldState != newState) {

                this.buttons.set(Number(k), newState ? InputState.Pressed : InputState.Released);
                this.anyPressed = this.anyPressed || newState;
            }
        }
    }


    public refreshGamepads() : void {

        const pads : (Gamepad | null)[] = navigator?.getGamepads() ?? [];

        this.activePad = pads[this.index];
        this.checkButtons();
    }


    public update() : void {

        this.anyPressed = false;

        this.leftStick.x = 0.0;
        this.leftStick.y = 0.0;

        this.updateButtons();
        this.updateStick();
    }


    public getButtonState(button : number) : InputState {

        return this.buttons.get(button) ?? InputState.Up;
    }


    public isAnyPressed = () : boolean => this.anyPressed;
}
