import { ProgramEvent } from "../core/event.js";


export class MenuButton {


    private text : string;
    private callback : (event : ProgramEvent) => void;


    private deactivated : boolean = false;

    
    constructor(text : string, callback : (event : ProgramEvent) => void) {

        this.text = text;
        this.callback = callback;
    }


    public getText = () : string => this.text;
    public evaluateCallback = (event : ProgramEvent) : void => this.callback(event);


    public clone() : MenuButton {

        return new MenuButton(this.text, this.callback);
    }


    public changeText(newText : string) :void {

        this.text = newText;
    }


    public toggleDeactivation(state : boolean) : void {

        this.deactivated = state;
    }


    public isDeactivated = () : boolean => this.deactivated;
}
