import { InputState } from "./inputstate.js";
import { Vector } from "../math/vector.js";
import { ProgramEvent } from "./event.js";


export class Mouse {


    private buttonStates : Map<number, InputState>;
    private prevent : Array<number>;
    private anyPressed : boolean = false;

    private unitPos : Vector;
    private scaledPos : Vector;


    constructor() {

        this.unitPos = new Vector();
        this.scaledPos = new Vector();

        this.prevent = new Array<number> ();

        this.buttonStates = new Map<number, InputState> ();

        window.addEventListener("mousedown", (ev : MouseEvent) => {

            this.buttonEvent(true, ev.button);
            if (this.prevent.includes(ev.button)) {

                ev.preventDefault();
            }

            // TODO: Redundant?
            window.focus();
        });
        window.addEventListener("mouseup", (ev : MouseEvent) => {

            this.buttonEvent(false, ev.button);
            if (this.prevent.includes(ev.button)) {

                ev.preventDefault();
            }
        });  

        window.addEventListener("mousemove", (ev : MouseEvent) : void => {

            this.unitPos.x = ev.clientX/window.innerWidth;
            this.unitPos.y = ev.clientY/window.innerHeight;

            // window.focus();
        });

        window.addEventListener("contextmenu", (ev : MouseEvent) => {ev.preventDefault();});
    }


    private buttonEvent(down : boolean, button : number) : void {

        if (down) {

            if (this.buttonStates.get(button) === InputState.Down) {

                return;
            }
            this.buttonStates.set(button, InputState.Pressed);
            this.anyPressed = true;
            return;
        }

        if (this.buttonStates.get(button) === InputState.Up) {

            return;
        }
        this.buttonStates.set(button, InputState.Released);
    }


    public computeScaledPosition(event : ProgramEvent) : void {

        this.scaledPos.x = Math.round(this.unitPos.x*event.screenWidth);
        this.scaledPos.y = Math.round(this.unitPos.y*event.screenHeight);
    }


    public update(event : ProgramEvent) : void {

        this.computeScaledPosition(event);

        for (let k of this.buttonStates.keys()) {
    
            if (this.buttonStates.get(k) === InputState.Pressed) {
    
                this.buttonStates.set(k, InputState.Down);
            }
            else if (this.buttonStates.get(k) === InputState.Released) {
    
                this.buttonStates.set(k, InputState.Up);
            }
        }
        this.anyPressed = false;
    }


    public getButtonState(button : number) : InputState {

        return this.buttonStates.get(button) ?? InputState.Up;
    }


    public preventButton(button : number) : void {

        this.prevent.push(button);
    } 
    

    public isAnyPressed = () : boolean => this.anyPressed;
    public getPosition = () : Vector => this.scaledPos.clone();
}
