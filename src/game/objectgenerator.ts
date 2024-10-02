import { ExistingObject, next } from "./existingobject.js";


export class ObjectGenerator<T extends ExistingObject> {


    protected objects : T[];
    protected baseType : Function;


    constructor(baseType : Function) {

        this.baseType = baseType;
        this.objects = new Array<T> ();
    }


    public next() : T {

        let o : T | undefined = next<T> (this.objects);
        if (o === undefined) {

            o = new this.baseType.prototype.constructor() as T;
            this.objects.push(o); 
        }
        return o;
    }
} 