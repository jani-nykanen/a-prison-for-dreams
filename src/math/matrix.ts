import { Vector } from "./vector";


export class Matrix {


    // This is public to make it possible to pass
    // data to the shader without having to make
    // a copy of it
    public m : Float32Array;


    // TODO: There is a much better way to do this, believe me
    constructor(
        a11 : number = 0.0, a12 : number = 0.0, a13 : number = 0.0, a14 : number = 0.0,
        a21 : number = 0.0, a22 : number = 0.0, a23 : number = 0.0, a24 : number = 0.0,
        a31 : number = 0.0, a32 : number = 0.0, a33 : number = 0.0, a34 : number = 0.0,
        a41 : number = 0.0, a42 : number = 0.0, a43 : number = 0.0, a44 : number = 0.0
    ) {

        this.m = new Float32Array(
            [a11, a12, a13, a14,
             a21, a22, a23, a24,
             a31, a32, a33, a34,
             a41, a42, a43, a44]);
    }


    static identity = () : Matrix => new Matrix(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1);


    static translate = (x : number, y : number, z : number = 0.0) : Matrix => new Matrix(
        1, 0, 0, x,
        0, 1, 0, y,
        0, 0, 1, z,
        0, 0, 0, 1);

    
    static scale = (sx : number, sy : number, sz : number = 1.0) : Matrix => new Matrix(
        sx, 0,  0,  0,
        0,  sy, 0,  0,
        0,  0,  sz, 0,
        0,  0,  0,  1);


    static basis = (v1 : Vector, v2 : Vector) : Matrix => new Matrix(

        v1.x, v2.x, 0, 0,
        v1.y, v2.y, 0, 0,
        0,    0,    1, 0,
        0,    0,    0, 1
    );
        

    static rotate(angle : number) : Matrix {
        
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        return new Matrix(
            c, -s, 0, 0,
            s,  c, 0, 0,
            0,  0, 0, 0,
            0,  0, 0, 1);
    }


    // TODO: Check if correct
    static view = (left : number, right : number, 
        bottom : number, top : number) : Matrix => new Matrix(
            2.0/(right - left), 0, 0, -(right + left)/(right - left),
            0, 2.0 / (top - bottom), 0, -(top + bottom)/(top-bottom),
            0, 0, 0, 0,
            0, 0, 0, 1);


    static multiply(left : Matrix, right : Matrix) : Matrix {

        const out = new Matrix();
    
        for (let i = 0; i < 4; ++ i) {
        
            for (let j = 0; j < 4; ++ j) {
        
                for (let k = 0; k < 4; ++ k) {
        
                    out.m[i*4 + j] += left.m[i*4 + k] * right.m[k*4 + j];
                }
            }
        }  
        return out;
    }


    static transpose(A : Matrix) : Matrix {

        const out = new Matrix();

        for (let j = 0; j < 4; ++ j) {
                
            for (let i = 0; i < 4; ++ i) {
                    
                out.m[i*4 + j] = A.m[j*4 + i];
            }
        }
        return out;
    }


    public clone = () : Matrix => new Matrix(...this.m);
}
