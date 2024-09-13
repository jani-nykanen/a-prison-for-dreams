

export class Vector {


    public x : number;
    public y : number;
    public z : number;
    public w : number;


	constructor(x : number = 0.0, y : number = 0.0, z : number = 0, w : number = 0) {
		
		this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
	}

	
	public get length() : number {

		return Math.hypot(this.x, this.y, this.z, this.w);
	}
	
	
	public normalize(forceUnit : boolean = false) : void {
		
		const EPS : number = 0.0001;
		
		const len : number = this.length;
		if (len < EPS) {
			
			this.x = forceUnit ? 1 : 0;
            this.y = 0;

			return;
		}
		
		this.x /= len;
		this.y /= len;
	}
	
	
	public clone = () : Vector => new Vector(this.x, this.y, this.z, this.w);


	public zeros() : void {

        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 0;
	}


	static dot = (u : Vector, v : Vector) : number => u.x*v.x + u.y*v.y + u.z*v.z + u.w*v.w;
	

	static normalize(v : Vector, forceUnit = false) : Vector {
        
        const out : Vector = v.clone();

        out.normalize(forceUnit);

        return out;
    }


	static scalarMultiply = (v : Vector, s : number) : Vector => new Vector(v.x*s, v.y*s, v.z*s, v.w*s);
	

	static distance = (a : Vector, b : Vector) : number => Math.hypot(
        a.x - b.x, 
        a.y - b.y,
        a.z - b.z,
        a.w - b.w
    );


	// Reminder to self: direction FROM a TO b
	static direction = (a : Vector, b : Vector) : Vector => Vector.normalize(
        new Vector(b.x - a.x, b.y - a.y, b.z - a.z, b.w - a.w), true);
	

	static add = (a : Vector, b : Vector) : Vector => new Vector(
        a.x + b.x, 
        a.y + b.y,
        a.z + b.z,
        a.w + b.w
    );


	static subtract = (a : Vector, b : Vector) : Vector => new Vector(
        a.x - b.x, 
        a.y - b.y,
        a.z - b.z,
        a.w - b.w
    );


	static cap(v : Vector, r : number, eps = 0.0001) : Vector {

		const out : Vector = v.clone();

		if (out.length >= r - eps) {

			out.normalize();

			out.x *= r;
			out.y *= r;
		}
		return out;
	}


	static project = (u : Vector, v : Vector) : Vector => Vector.scalarMultiply(v, Vector.dot(u, v));


	static lerp = (a : Vector, b : Vector, t : number) : Vector => new Vector(
        (1 - t)*a.x + t*b.x, 
        (1 - t)*a.y + t*b.y,
        (1 - t)*a.z + t*b.z, 
        (1 - t)*a.w + t*b.w
    );


	static max = (v : Vector) : number => Math.max(v.x, v.y, v.z, v.w);

}
