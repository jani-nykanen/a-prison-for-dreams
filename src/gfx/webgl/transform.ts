import { Matrix } from "../../math/matrix.js";
import { Vector } from "../../math/vector.js";
import { Transform2D, TransformTarget } from "../interface.js";
import { Shader } from "./shader.js";


class Target {

    public matrix : Matrix;
    public stack : Matrix[];


    constructor() {

        this.matrix = Matrix.identity();
        this.stack = new Array<Matrix> ();
    }
}


export class WebGLTransform implements Transform2D {


    private target : Map<TransformTarget, Target>;
    private activeTarget : Target;
    private product : Matrix;

    private applyEvent : (transf : WebGLTransform) => void;

    public productComputed : boolean = true; // Why is this public?


    constructor(applyEvent : (transf : WebGLTransform) => void) {

        const initialTarget = new Target();

        this.target = new Map<TransformTarget, Target> ();

        this.target.set(TransformTarget.Model, initialTarget);
        this.target.set(TransformTarget.Camera, new Target());

        this.activeTarget = initialTarget;

        this.applyEvent = applyEvent;

        this.product = Matrix.identity();
    }


    private computeProduct() : void {

        const view : Matrix = this.target.get(TransformTarget.Camera)?.matrix ?? Matrix.identity();
        const model : Matrix = this.target.get(TransformTarget.Model)?.matrix ?? Matrix.identity();

        this.product = Matrix.transpose(Matrix.multiply(view, model));
    }


    public setTarget(target : TransformTarget) : void {

        this.activeTarget = this.target.get(target) ?? this.activeTarget;
    }


    public loadIdentity() : void {
        
        this.activeTarget.matrix = Matrix.identity();
        this.productComputed = false;
    }


    public translate(x : number, y : number) : void {
        
        this.activeTarget.matrix = Matrix.multiply(
            this.activeTarget.matrix,
            Matrix.translate(x, y));
        
        this.productComputed = false;
    }


    public scale(sx : number, sy : number) : void {
        
        this.activeTarget.matrix = Matrix.multiply(
            this.activeTarget.matrix,
            Matrix.scale(sx, sy));
        
        this.productComputed = false;
    }


    public rotate(angle: number) : void {

        this.activeTarget.matrix = Matrix.multiply(
            this.activeTarget.matrix,
            Matrix.rotate(angle));
        
        this.productComputed = false;
    }


    public operateBasis(v1 : Vector, v2 : Vector) : void {

        this.activeTarget.matrix = Matrix.multiply(
            this.activeTarget.matrix,
            Matrix.basis(v1, v2));
        
        this.productComputed = false;
    }


    public view(width : number, height : number) : void {
        
        this.activeTarget.matrix = Matrix.view(0, width, height, 0);
        
        this.productComputed = false;
    }


    public fitDimension(dimension : number, width : number, height : number) : void {

        const ratio : number = width/height;

        if (ratio >= 1.0) {

            this.view(Math.round(ratio*dimension), dimension);
            return;
        }

        this.view(dimension, Math.round(dimension/ratio));
    }


    public push() : void {
        
        const MAX_SIZE : number = 64;

        if (this.activeTarget.stack.length >= MAX_SIZE) {

            console.warn("Warning: matrix stack overflow!");
            return;
        }

        this.activeTarget.stack.push(this.activeTarget.matrix.clone());
    }


    public pop() : void {

        this.activeTarget.matrix = this.activeTarget.stack.pop() ?? this.activeTarget.matrix;

        this.productComputed = false;
    }


    public use(shader : Shader) : void {
        
        if (!this.productComputed) {

            this.computeProduct();
            this.productComputed = true;
        }

        shader.setTransformMatrix(this.product);
    }

    
    public apply() : void {

        this.applyEvent(this);
    }
}
