import { ProgramEvent } from "../core/event.js";


export type MapTransitionCallback = (
    newMap : string, 
    spawnPos : number, 
    pose : number,
    createPlayer : boolean,
    event : ProgramEvent,
    save? : boolean) => void;
