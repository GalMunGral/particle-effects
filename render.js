const { mat4, vec3 } = glMatrix;

var prevTimestamp = 0;
var totalTime = 0;
var totalFrames = 0;

// Physics 

const BOX_SIZE = 4;
const RESET_DELAY_MS = 5000;
const G_GRAVITY = vec3.fromValues(0, 0, -9.80665);
const E_SPHERE = 0.9;
const E_WALL = 0.5;
const C_AIR = 0.1;

var N_PARTICLE = 50;
var MIN_RADIUS = 0;
var MAX_RADIUS = 0;

var particles = [];

var prevTimer = -1;
function resetParticles() {
  prevTimestamp = 0;
  totalTime = 0;
  totalFrames = 0;

  MIN_RADIUS = 0.15 * BOX_SIZE / Math.sqrt(N_PARTICLE);
  MAX_RADIUS = 4 * MIN_RADIUS;

  particles = Array(N_PARTICLE).fill(0).map(() => {
    const color = vec3.fromValues(random(), random(), random());
    const radius = random(MIN_RADIUS, MAX_RADIUS);
    const mass = radius ** 3;
    const position = vec3.random(vec3.create(), Math.random() * BOX_SIZE / 2);
    const velocity = vec3.random(vec3.create(), Math.random() * BOX_SIZE * 5);
    return {
      position,
      velocity,
      radius,
      mass,
      color,
    };
  });

  clearTimeout(prevTimer);
  prevTimer = setTimeout(resetParticles, RESET_DELAY_MS);
}

const d = vec3.create();
function detectCollision(p1, p2) {
  vec3.sub(d, p2.position, p1.position);
  const dist = vec3.len(d);
  if (dist > p1.radius + p2.radius) return;

  vec3.normalize(d, d);
  const s1 = vec3.dot(p1.velocity, d);
  const s2 = vec3.dot(p2.velocity, d);
  const s = s1 - s2;
  if (s <= 0) return;

  const w1 = p2.mass / (p1.mass + p2.mass);
  const w2 = p1.mass / (p1.mass + p2.mass);
  vec3.scaleAndAdd(p1.velocity, p1.velocity, d, -w1 * (1 + E_SPHERE) * s);
  vec3.scaleAndAdd(p2.velocity, p2.velocity, d, +w2 * (1 + E_SPHERE) * s);
}

/**
 * Updates particle states using Euler's method
 * @param {number} dt time elapsed since last frame
 */
function updateParticles(dt) {
  // I. position update
  for (const p of particles) {
    vec3.scaleAndAdd(p.position, p.position, p.velocity, dt);
    for (let i = 0; i < 3; ++i) {
      // FIX: positions now needs to be clamped so that particles stay in the grid
      p.position[i] = clamp(p.position[i], -BOX_SIZE / 2, BOX_SIZE / 2);
    }
  }

  // II. velocity update
  for (const p of particles) {
    // 1. gravity
    vec3.scaleAndAdd(p.velocity, p.velocity, G_GRAVITY, dt);
    // 2. drag: a = f/m = -cvr^2/m (assuming all particles are slow) --> dv = -cvr^2t/m
    vec3.scaleAndAdd(p.velocity, p.velocity, p.velocity, - C_AIR * p.radius ** 2 * dt / p.mass);
    // 3. wall collisions: dv = -(1 + e)s --> v[i] = -ev[i]
    for (let i = 0; i < 3; ++i) {
      if (
        BOX_SIZE / 2 - p.position[i] <= p.radius && p.velocity[i] > 0 ||
        p.position[i] + BOX_SIZE / 2 <= p.radius && p.velocity[i] < 0
      ) {
        p.velocity[i] = -E_WALL * p.velocity[i];
      }
    }
  }
  // 4. sphere-sphere collisions
  // for (let p1 of particles) {
  //   for (let p2 of particles) {
  //     detectCollision(p1, p2);
  //   }
  // }
  const GRID_SIZE = 2 * MAX_RADIUS;
  const N = Math.floor(BOX_SIZE / GRID_SIZE) + 1;
  const grid = Array(N).fill(0).map(() => Array(N).fill(0).map(() => Array(N).fill(0).map(() => [])));
  const toIndex = x => Math.floor((x + BOX_SIZE / 2) / GRID_SIZE);

  for (let p of particles) {
    const [i, j, k] = p.position.map(toIndex);
    grid[i][j][k].push(p);
  }

  for (let p1 of particles) {
    const [i, j, k] = p1.position.map(toIndex);
    for (let gi of [i - 1, i, i + 1]) {
      for (let gj of [j - 1, j, j + 1]) {
        for (let gk of [k - 1, k, k + 1]) {
          if (gi >= 0 && gi < N && gj >= 0 && gj < N && gk >= 0 && gk < N) {
            for (let p2 of grid[gi][gj][gk]) {
              detectCollision(p1, p2);
            }
          }
        }
      }
    }
  }
}

// Rendering

/** @type {WebGL2RenderingContext} */ var gl;
/** @type {WebGLProgram} */ var sphereProgram;
var sphereGeom;

const NEAR_PLANE = 1;
const FAR_PLANE = 4 * BOX_SIZE;
const M = mat4.create();
const V = mat4.create();
const P = mat4.create();

const eye = vec3.fromValues(BOX_SIZE, -BOX_SIZE, 0);
const center = vec3.fromValues(0, 0, 0);
const up = vec3.fromValues(0, 0, 1);
mat4.lookAt(V, eye, center, up);

/**
 * Draws one frame
 * @param {number} timestamp milliseconds
 */
function draw(timestamp) {
  let dt = 0;
  if (prevTimestamp) {
    dt = (timestamp - prevTimestamp) / 1000;
    ++totalFrames;
    totalTime += dt;
    document.querySelector('#fps').innerHTML = `FPS: ${(totalFrames / totalTime).toFixed(2)}`;
  }
  prevTimestamp = timestamp;

  // Simulate
  updateParticles(dt);

  // Render
  gl.clearColor(0.4, 0.4, 0.4, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!sphereGeom) return;

  gl.useProgram(sphereProgram);
  gl.bindVertexArray(sphereGeom.vao);
  gl.uniform3fv(gl.getUniformLocation(sphereProgram, 'eye'), eye);
  gl.uniformMatrix4fv(gl.getUniformLocation(sphereProgram, 'v'), false, V);
  gl.uniformMatrix4fv(gl.getUniformLocation(sphereProgram, 'p'), false, P);

  const Translation = mat4.create();
  const Scale = mat4.create();

  for (const p of particles) {
    mat4.fromTranslation(Translation, p.position);
    mat4.fromScaling(Scale, vec3.fromValues(p.radius, p.radius, p.radius));
    mat4.mul(M, Translation, Scale);
    gl.uniformMatrix4fv(gl.getUniformLocation(sphereProgram, 'm'), false, M);
    gl.vertexAttrib3fv(gl.getAttribLocation(sphereProgram, 'color'), p.color);
    gl.drawElements(sphereGeom.mode, sphereGeom.count, sphereGeom.type, 0);
  }

  requestAnimationFrame(draw);
}

function fillScreen() {
  let canvas = document.querySelector('canvas');
  document.body.style.margin = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  canvas.style.width = '';
  canvas.style.height = '';

  mat4.perspective(P, Math.PI / 2, canvas.width / canvas.height, NEAR_PLANE, FAR_PLANE);

  if (gl) {
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

async function setup() {
  gl = document.querySelector('canvas').getContext('webgl2', { antialias: false, depth: true, preserveDrawingBuffer: true });
  gl.enable(gl.DEPTH_TEST);

  sphereProgram = await compileAndLinkGLSL(gl, 'sphere_vertex.glsl', 'sphere_fragment.glsl');
  sphereGeom = await setupGeomery(gl, sphereProgram, makeSphere());
  resetParticles();

  fillScreen();
  requestAnimationFrame(draw);

  const count = document.querySelector('#count');
  const control = document.querySelector('#control input');
  count.textContent = 'number of particles: ' + control.value;

  control.addEventListener('input', (e) => {
    count.textContent = 'number of particles: ' + control.value;
    N_PARTICLE = Number(control.value);
    resetParticles();
  });
}

window.addEventListener('load', setup);
window.addEventListener('resize', fillScreen);

function makeSphere() {
  const RINGS = 20;
  const SLICES = 20;
  const latStep = Math.PI / (RINGS - 1);
  const lngStep = 2 * Math.PI / SLICES;
  const ind = (i, j) => i * SLICES + j;

  const positions = [];
  for (let i = 0; i < RINGS; ++i) {
    for (let j = 0; j < SLICES; ++j) {
      positions.push([
        Math.sin(i * latStep) * Math.cos(lngStep * j),
        Math.sin(i * latStep) * Math.sin(lngStep * j),
        Math.cos(i * latStep)
      ])
    }
  }

  const triangles = [];
  for (let i = 0; i < RINGS - 1; ++i) {
    for (let j = 0; j < SLICES; ++j) {
      triangles.push(
        [ind(i, j), ind(i + 1, j), ind(i, (j + 1) % SLICES)],
        [ind(i, (j + 1) % SLICES), ind(i + 1, j), ind(i + 1, (j + 1) % SLICES)]
      );
    }
  }

  return {
    triangles,
    attributes: {
      position: positions,
    },
  }
}

function random(min = 0, max = min + 1) {
  return min + (max - min) * Math.random();
}

function clamp(n, min = -Infinity, max = Infinity) {
  return Math.max(Math.min(n, max), min);
}
