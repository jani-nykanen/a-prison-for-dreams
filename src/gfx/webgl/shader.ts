import { Matrix } from "../../math/matrix.js";


const UNIFORM_NAMES = [

    "transform",
    "pos",
    "scale",
    "texPos",
    "texScale",
    "color",
    "texSampler"
];


export class Shader {


    private uniforms : Map<string, WebGLUniformLocation | null>;
    private program : WebGLShader;

    private readonly gl : WebGLRenderingContext;


    constructor(gl : WebGLRenderingContext, vertexSource : string, fragmentSource : string) {

        this.gl = gl;

        this.uniforms = new Map<string, WebGLUniformLocation | null> ();
        this.program = this.buildShader(vertexSource, fragmentSource);

        this.getUniformLocations();
    }
    

    private createShader(src : string, type : number) : WebGLShader {

        const gl : WebGLRenderingContext  = this.gl
    
        const shader : WebGLShader | null = gl.createShader(type);
        // TODO: Does this ever happen?
        if (shader === null) {

            throw new Error("Failed to create a shader!");
        }

        gl.shaderSource(shader, src);
        gl.compileShader(shader);
    
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    
            throw new Error("Shader error:\n" + gl.getShaderInfoLog(shader));
        }
        return shader;
    }


    private buildShader(vertexSource : string, fragmentSource : string) : WebGLShader {

        const gl : WebGLRenderingContext = this.gl;
    
        const vertex : WebGLProgram | null = this.createShader(vertexSource, gl.VERTEX_SHADER);
        const frag : WebGLProgram | null  = this.createShader(fragmentSource, gl.FRAGMENT_SHADER);
        const program : WebGLProgram | null = gl.createProgram();
        if (program === null) {

            throw new Error("Failed to create a WebGL shader program!");
        }

        gl.attachShader(program, vertex);
        gl.attachShader(program, frag);
    
        this.bindLocations(program);

        gl.linkProgram(program);
    
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    
            throw new Error("Shader error: " + gl.getProgramInfoLog(program));
        }
        return program;
    }

    
    private bindLocations(program : WebGLShader) : void {

        const gl : WebGLRenderingContext = this.gl;

        gl.bindAttribLocation(program, 0, "vertexPos");
        gl.bindAttribLocation(program, 1, "vertexUV");
        // gl.bindAttribLocation(program, 2, "vertexColor");
    }


    private getUniformLocations() : void {

        const gl : WebGLRenderingContext = this.gl;

        for (let s of UNIFORM_NAMES) {  

            this.uniforms.set(s, gl.getUniformLocation(this.program, s));
        }
    }


    public use() : void {

        const gl : WebGLRenderingContext = this.gl;
    
        gl.useProgram(this.program);
        this.getUniformLocations();

        gl.uniform1i(this.uniforms.get("texSampler") ?? null, 0);

        this.setVertexTransform(0, 0, 1, 1);
        this.setFragTransform(0, 0, 1, 1);
        this.setTransformMatrix(Matrix.identity());
        this.setColor(1, 1, 1, 1);
    }


    public setVertexTransform(x : number, y : number, w : number, h : number) : void {

        const gl : WebGLRenderingContext = this.gl;

        gl.uniform2f(this.uniforms.get("pos") ?? null, x, y);
        gl.uniform2f(this.uniforms.get("scale") ?? null, w, h);
    }


    public setFragTransform(x : number, y : number, w : number, h : number) : void {

        const gl : WebGLRenderingContext = this.gl;

        gl.uniform2f(this.uniforms.get("texPos") ?? null, x, y);
        gl.uniform2f(this.uniforms.get("texScale") ?? null, w, h);
    }


    public setColor(r = 1, g = 1, b = 1, a = 1) : void {

        const gl : WebGLRenderingContext = this.gl;
        gl.uniform4f(this.uniforms.get("color") ?? null, r, g, b, a);
    }


    public setTransformMatrix(matrix : Matrix) : void {

        const gl : WebGLRenderingContext = this.gl;

        gl.uniformMatrix4fv(this.uniforms.get("transform") ?? null, false, matrix.m);      
    }
}
