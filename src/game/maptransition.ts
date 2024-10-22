import { ProgramEvent } from "../core/event.js";


export type MapTransitionCallback = (newMap : string, spawnPos : number, event : ProgramEvent, createPlayer? : boolean) => void;
