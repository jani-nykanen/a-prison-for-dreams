import { ProgramEvent } from "../core/event.js";


export class MenuButton {


    private text : string;
    private callback : ((event : ProgramEvent) => void) | undefined = undefined;
    private leftEvent : ((event : ProgramEvent) => void) | undefined = undefined
    private rightEvent : ((event : ProgramEvent) => void) | undefined = undefined


    private deactivated : boolean = false;

    
    constructor(text : string, 
        callback : ((event : ProgramEvent) => void) | undefined = undefined,
        leftEvent : ((event : ProgramEvent) => void) | undefined = undefined,
        rightEvent : ((event : ProgramEvent) => void) | undefined = undefined) {

        this.text = text;
        this.callback = callback;
        this.leftEvent = leftEvent;
        this.rightEvent = rightEvent;
    }


    public getText = () : string => this.text;


    public evaluateCallback(event : ProgramEvent) : boolean {
        
        if (this.callback === undefined) {

            return false;
        }
        this.callback(event);
        return true;
    }


    public evaluateLeftCallback(event : ProgramEvent)  : boolean {

        if (this.leftEvent === undefined) {

            return false;
        }
        this.leftEvent(event);
        return true;
    }


    public evaluateRightCallback(event : ProgramEvent) : boolean {
        
        if (this.rightEvent === undefined) {

            return false;
        }
        this.rightEvent(event);
        return true;
    }


    public clone() : MenuButton {

        return new MenuButton(this.text, this.callback, this.leftEvent, this.rightEvent);
    }


    public changeText(newText : string) :void {

        this.text = newText;
    }


    public toggleDeactivation(state : boolean) : void {

        this.deactivated = state;
    }


    public isDeactivated = () : boolean => this.deactivated;
}
