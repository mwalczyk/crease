# crease
📐 A web-based crease pattern editor for origami.

<p align="center">
  <img src="" alt="screenshot" width="400" height="auto"/>
</p>

## Description

Some background information on origami, crease patterns, and planar graphs.

## Tested On
- Firefox

## To Build
1. Clone this repo.
2. Make sure [npm](https://www.npmjs.com/) is installed and in your `PATH`, as well as the necessary tooling for bundling the application:
```
npm install -g browserify
npm install -g watchify
npm install --save-dev babelify @babel/core
npm install --save-dev @babel/preset-env
```
3. Inside the repo, run: `npm install` to install dependencies.
4. Finally, run: `npm run bundle`.
5. Open `index.html` in your browser.
6. During development, you can run `npm run bundle-watch` for live reloading.

## To Use

Some notes about usage.

## To Do
- [ ] 

## Credits
This project was largely inspired by Jun Mitani's Java application, [ORIPA](http://mitani.cs.tsukuba.ac.jp/oripa/) and Erik Demaine's [FOLD](https://github.com/edemaine/fold). Erik Demaine's own crease pattern editor was also a very helpful reference, especially in terms of understanding the interop between SVG elements and planar graphs.

Some other resources that were useful during the creation of this project:

1. [Calculating Perpendiculars](https://stackoverflow.com/questions/1811549/perpendicular-on-a-line-from-a-given-point)
2. [Calculating Line Segment Intersections](https://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect)
3. [Calculating Triangle Incenters](https://www.mathopenref.com/coordincenter.html)
4. [Calculating Line Intersections](https://rosettacode.org/wiki/Find_the_intersection_of_two_lines)
5. [Calculating Perpendicular Bisectors](https://socratic.org/questions/how-do-you-find-the-equation-of-the-perpendicular-bisector-of-the-points-1-4-and)

### License
[Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/)

