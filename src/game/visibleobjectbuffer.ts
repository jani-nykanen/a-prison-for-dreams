import { GameObject } from "./gameobject.js";


export class VisibleObjectBuffer<T extends GameObject>  {


    private objects : T[];
    private size : number = 0;


    constructor() {

        this.objects = new Array<T> ();
    }


    public refresh(masterPool : T[]) : void {

        this.size = 0;
        for (let o of masterPool) {

            if (o.isInCamera()) {

                this.objects[this.size] = o;
                ++ this.size;
            }
        }
    }


    public iterateThroughVisibleObjects(func : (object : T, index? : number) => void, startIndex : number = 0) : void {

        for (let i = startIndex; i < this.size; ++ i) {

            func(this.objects[i], i);
        }
    }


    public clear() : void {

        this.size = 0;
    }
}
