import { ProgramEvent } from "../core/event.js";
import { Pose } from "./player.js";


export type MapTransitionCallback = (
    newMap : string, 
    spawnPos : number, 
    pose : Pose,
    createPlayer : boolean,
    event : ProgramEvent,
    save? : boolean) => void;
