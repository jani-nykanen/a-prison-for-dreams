

export class RGBA {

	
	public r : number;
	public g : number;
	public b : number;
	public a : number;


	constructor(r : number = 255, g : number = r, b : number = g, a : number = 1) {

		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}


    public clone = () : RGBA => new RGBA(this.r, this.g, this.b, this.a);


	static invertUnsignedByte(c : RGBA) : RGBA {

		const out : RGBA = new RGBA();

		out.r = Math.round(255 - c.r);
		out.g = Math.round(255 - c.g);
		out.b = Math.round(255 - c.b);

		return out;
	}
}
