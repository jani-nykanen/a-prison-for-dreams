import { InputState } from "./inputstate.js";


export class Keyboard {


    private states : Map<string, InputState>;
    private prevent : Array<string>;

    private anyPressed : boolean = false;


    constructor() {

        this.states = new Map<string, InputState> ();
        this.prevent = new Array<string> ("ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "KeyA", "KeyS", "KeyD", "KeyW");

        window.addEventListener("keydown", (e : any) => {

            this.keyEvent(true, e.code);
            if (this.prevent.includes(e.code)) {

                e.preventDefault();
            }
            
        });
        window.addEventListener("keyup", (e : any) => {

            this.keyEvent(false, e.code);
            if (this.prevent.includes(e.code)) {

                e.preventDefault();
            }
        });  
    }


    private keyEvent(down : boolean, key : string) : void {

        if (down) {

            if (this.states.get(key) === InputState.Down) {

                return;
            }
            this.states.set(key, InputState.Pressed);
            this.anyPressed = true;
            return;
        }

        if (this.states.get(key) === InputState.Up) {

            return;
        }
        this.states.set(key, InputState.Released);
    }


    public update() : void {

        for (let k of this.states.keys()) {

            if (this.states.get(k) === InputState.Pressed) {

                this.states.set(k, InputState.Down);
            }
            else if (this.states.get(k) === InputState.Released) {

                this.states.set(k, InputState.Up);
            }
        }
        this.anyPressed = false;
    }


    public getKeyState(name : string) : InputState {

        return this.states.get(name) ?? InputState.Up;
    }


    public isAnyPressed = () : boolean => this.anyPressed;


    public preventKey(key : string) : void {

        this.prevent.push(key);
    } 
}
