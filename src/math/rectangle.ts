import { Vector } from "./vector";


export class Rectangle {


    public x : number;
    public y : number;
    public w : number;
    public h : number;


    constructor(x = 0, y = 0, w = 0, h = 0) {

        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }


    public clone = () : Rectangle => new Rectangle(this.x, this.y, this.w, this.h);

}


export const overlayRect = (ashift : Vector, A : Rectangle, bshift : Vector, B : Rectangle) : boolean => 
    ashift.x + A.x + A.w/2 >= bshift.x + B.x - B.w/2 &&
    ashift.x + A.x - A.w/2 <= bshift.x + B.x + B.w/2 &&
    ashift.y + A.y + A.h/2 >= bshift.y + B.y - B.h/2 &&
    ashift.y + A.y - A.h/2 <= bshift.y + B.y + B.h/2;
