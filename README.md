## A Prison for Dreams

*A Prison for Dreams* is maybe not-so-surprisingly a yet another 2D metroidvania thing, in the style of my previous games, except bigger and better than ever before!

[Play here](https://jani-nykanen.itch.io/a-prison-for-dreams?secret=OroEZ7JIPtbNggiN50o3q8A4t4)



-----


## Building

The following tools are required:
- **TypeScript compiler**
- **Git LFS** (to get access to the asset files)
- **Closure compiler** (optional)

To build the game, clone the repo
```
git clone https://github.com/jani-nykanen/a-prison-for-dreams
```
and run 
```
tsc
```
(or `make js` if you have `make` installed). It will compile the TypeScript source to Javascript, and you can run the game by starting a server in the root (for example run `make server` and open `localhost:8000` in your browser).

If you want to compile a redistributable and compressed zip package, run 
```
make CLOSURE_PATH=<path to closure jar file> dist 
```
(there is a bug that requires you to run `tsc` first, otherwise the thing will faill).

If you want to make a lot of changes to the source, it is recommended to compile the source in watch mode (`tsc -w` or `make watch`).


-----


## Building a desktop version

Run `make CLOSURE_PATH=<path to closure jar file> nwpackage`. It will create a file called `package.nw`. Then download [nw.js](https://nwjs.io/), unpack it and put `package.nw` to the root.

-----


## License:

The game uses the following licenses:
1. [MIT license](https://opensource.org/license/mit) for all the source code files, which contain all `.html`, `.css`, `.json` and `.ts` files.
2. [CC BY-NC 4.0 DEED](https://creativecommons.org/licenses/by-nc/4.0/deed.en) for all asset files in the `assets` folder **(excluding .ogg files other than `item.ogg`, see below)**  and should be attributed to Jani Nykänen.
3. [CC BY-NC 4.0 DEED](https://creativecommons.org/licenses/by-nc/4.0/deed.en) for all `.ogg` files in the `assets/audio` **(excluding `item.ogg`)** folder and should be attributed to H0dari.

In short: if you want to modify the game and distribute it, then go ahead, but **if you use any of the original assets, *then you must give credit to the original author and commercial use is forbidden***.

-----

(c) 2024-2025 Jani Nykänen
