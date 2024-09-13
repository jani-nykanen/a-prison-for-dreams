import { InputState } from "./inputstate.js";
import { Vector } from "../math/vector.js";


// TODO: Some weird type stuff going here,
// pad can be undefined


// Gamepad was taken...
export class GamePad {


    private leftStick : Vector;
    private pad : Gamepad | null = null;
    private index : number = -1;
    private buttons : Map<number, InputState>;
    private anyPressed : boolean = false;


    public get stick() : Vector {

        return this.leftStick.clone();
    }


    constructor() {

        this.leftStick = new Vector();
        this.buttons = new Map<number, InputState> ();

        window.addEventListener("gamepadconnected", (ev : GamepadEvent) => {

            if (this.index < 0) {

                console.log("Gamepad with index " + 
                    String(ev["gamepad"].index) + 
                    " connected.");
            }
            else {

                console.log("Gamepad with index " + 
                        String(ev["gamepad"].index) + 
                        " connected but ignored due to some weird technical reasons.");
                return;
            }

            const gp = navigator.getGamepads()[ev["gamepad"].index] ?? null;
            this.index = ev["gamepad"].index;
            this.pad = gp;

            this.updateGamepad(this.pad);
        });
    }


    private pollGamepads() : (Gamepad | null) [] | null {

        if (navigator === null) {

            return null;
        }
        return navigator.getGamepads();
    }


    private updateButtons(pad : Gamepad | null | undefined) : void {

        // TODO: What is the purpose of this...?
        // TODO 2: The TODO above is six months old, and I still have no idea.
        // Maybe if gamepad is disconnected this is needed?
        if (pad === null || pad === undefined) {

            for (let k in this.buttons) {

                this.buttons[k] = InputState.Up;
            }
            return;
        }

        for (let i = 0; i < pad.buttons.length; ++ i) {

            if (this.buttons[i] === undefined) {

                this.buttons[i] = InputState.Up;
            }

            if (pad.buttons[i].pressed) {

                if ((this.buttons[i] & InputState.DownOrPressed) == 0) {
                    
                    this.anyPressed = true;
                    this.buttons[i] = InputState.Pressed;
                }
                else {

                    this.buttons[i] = InputState.Down;
                }
            }
            else {

                if ((this.buttons[i] & InputState.DownOrPressed) == 1) {

                    this.buttons[i] = InputState.Released;
                }
                else {

                    this.buttons[i] = InputState.Up;
                }
            }
        }
    }


    private updateStick(pad : Gamepad | null | undefined) : void {
        
        const DEADZONE = 0.25;

        if (pad === null || pad === undefined)
            return;

        let noLeftStick = true;
            
        this.leftStick.x = 0;
        this.leftStick.y = 0;

        if (Math.abs(pad.axes[0]) >= DEADZONE) {

            this.leftStick.x = pad.axes[0];
            noLeftStick = false;
        }
        if (Math.abs(pad.axes[1]) >= DEADZONE) {

            this.leftStick.y = pad.axes[1];
            noLeftStick = false;
        }

        // On Firefox dpad is considered
        // axes, not buttons
        if (pad.axes.length >= 8 && noLeftStick) {

            if (Math.abs(pad.axes[6]) >= DEADZONE) {

                this.leftStick.x = pad.axes[6];
            }
            if (Math.abs(pad.axes[7]) >= DEADZONE) {
                
                this.leftStick.y = pad.axes[7];
            }
        }
    }


    private updateGamepad(pad : Gamepad | null | undefined) : void {
        
        this.updateStick(pad);
        this.updateButtons(pad);
    }


    private refreshGamepads() : void {

        if (this.pad == null) return;

        let pads = this.pollGamepads();
        if (pads == null) 
            return;
            
        this.pad = pads[this.index];
    }


    public update() : void {

        this.anyPressed = false;

        this.leftStick.x = 0.0;
        this.leftStick.y = 0.0;

        this.refreshGamepads();
        this.updateGamepad(this.pad);
    }


    public getButtonState(button : number) : InputState {

        const state : InputState = this.buttons[button];

        if (state == undefined)
            return InputState.Up;

        return state;
    }


    public isAnyPressed = () : boolean => this.anyPressed;
}
