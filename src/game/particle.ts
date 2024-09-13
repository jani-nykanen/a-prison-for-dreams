import { Flip } from "../gfx/interface.js";
import { ExistingObject } from "./existingobject.js";


export interface Particle extends ExistingObject {

    spawn(x : number, y : number, speedx : number, speedy : number, id : number, flip? : Flip) : void;
}
