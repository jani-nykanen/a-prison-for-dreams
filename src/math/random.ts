


export function sampleWeightedUniform(weights : number[]) : number {

    const p : number = Math.random();

    let sum : number = 0.0;
    let i : number = 0;
    for (; i < weights.length; ++ i) {

        sum += weights[i];
        if (p <= sum) {

            return i;
        }
    }
    return i;
}


export function sampleInterpolatedWeightedUniform(weights1 : number[], weights2 : number[], t : number) : number {

    const p : number = Math.random();

    let sum : number = 0.0;
    let i : number = 0;
    for (; i < Math.min(weights1.length, weights2.length); ++ i) {

        sum += weights1[i]*(1.0 - t) + t*weights2[i];
        if (p <= sum) {

            return i;
        }
    }
    return i;
}
