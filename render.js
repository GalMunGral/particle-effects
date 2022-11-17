const { mat4, vec3 } = glMatrix;

const BOX_SIZE = 100;
const NEAR_PLANE = 10;
const FAR_PLANE = 4 * BOX_SIZE;

/** @type {WebGL2RenderingContext} */ var gl;
/** @type {WebGLProgram} */ var program
var geom;

const m = mat4.create();
const v = mat4.create();
const p = mat4.create();
const camera = vec3.fromValues(BOX_SIZE, -BOX_SIZE, BOX_SIZE / 2);
const center = vec3.fromValues(0, 0, 0);
const up = vec3.fromValues(0, 0, 1);
mat4.lookAt(v, camera, center, up);

const MIN_RADIUS = BOX_SIZE / 30;
const MAX_RADIUS = BOX_SIZE / 10;


// physics

function random(min, max) {
  return Math.random() * (max - min) + min;
}

let particles = [];

function resetParticles() {
  particles = Array(50).fill(0).map((_, i) => {
    let position = vec3.fromValues(0, 0, 0);
    let velocity = vec3.fromValues(random(-500, 500), random(-500, 500), random(-500, 500));
    const radius = random(MIN_RADIUS, MAX_RADIUS)
    return {
      color: new Float32Array([Math.random(), Math.random(), Math.random()]),
      mass: radius ** 3,
      radius,
      position,
      velocity
    };
  });
}

setInterval(resetParticles, 8000);
resetParticles();


const g = vec3.fromValues(0, 0, -9.8);

const T = mat4.create();
const S = mat4.create();

function stateUpdate(p, dt) {
  const { position, velocity } = p;
  vec3.scaleAndAdd(position, position, velocity, dt);

  for (let i = 0; i < 3; ++i) {
    if (position[i] > BOX_SIZE / 2) {
      position[i] = BOX_SIZE / 2;
      if (velocity[i] > 0) {
        velocity[i] = -e * velocity[i];
      }
    } else if (position[i] < -BOX_SIZE / 2) {
      position[i] = -BOX_SIZE / 2;
      if (velocity[i] < 0) {
        velocity[i] = -e * velocity[i];
      }
    }
  }
  vec3.scale(velocity, velocity, 0.99);
  vec3.add(velocity, velocity, g);

}

function drawParticle(p, dt) {
  
  const { color, radius, velocity, position } = p;

  // console.log('draw particle', position, velocity, dt)
  // if (vec3.len(velocity) > 1) {
    stateUpdate(p, dt);
  // }


 
  mat4.fromTranslation(T, position);
  mat4.fromScaling(S, vec3.fromValues(radius, radius, radius));
  mat4.mul(m, T, S);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'm'), false, m);
  gl.vertexAttrib3fv(gl.getAttribLocation(program, 'color'), color);
  gl.drawElements(geom.mode, geom.count, geom.type, 0);
}

const e = 0.8;

function detectCollision(p1, p2) {
  const d = vec3.create();
  vec3.sub(d, p2.position, p1.position);
  if (vec3.len(d) >= p1.radius + p2.radius) return false;

  vec3.normalize(d, d);
  const s1 = vec3.dot(p1.velocity, d);
  const s2 = vec3.dot(p2.velocity, d);
  const s = s1 - s2;
  if (s <= 0) return false;

  vec3.scaleAndAdd(p1.velocity, p1.velocity, d, -(p2.mass / (p1.mass + p2.mass)) * (1 + e) * s);
  vec3.scaleAndAdd(p2.velocity, p2.velocity, d, (p1.mass / (p1.mass + p2.mass)) * (1 + e) * s);
  return true;
}

/**
 * Draw one frame
 */

let time = 0;

function draw(t) {
  const dt = time ? (t - time) / 1000 : 0;
  time = t;

  document.querySelector('#fps').textContent = `FPS: ${(1 / dt).toFixed(1)}`;

  gl.clearColor(0.5, 0.5, 0.5, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!geom) return;

  gl.useProgram(program);
  gl.bindVertexArray(geom.vao);
  gl.uniform3fv(gl.getUniformLocation(program, 'eye'), camera);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'v'), false, v);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p);

  particles.forEach(p => drawParticle(p, dt))
  for (let p1 of particles) {
    for (let p2 of particles) {
      detectCollision(p1, p2);
    }
  }
  requestAnimationFrame(draw);
}


/**
 * Resizes the canvas to completely fill the screen
 */
function fillScreen() {
  let canvas = document.querySelector('canvas')
  document.body.style.margin = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  canvas.style.width = ''
  canvas.style.height = ''
  // to do: update aspect ratio of projection matrix here
  mat4.perspective(p, Math.PI / 2, canvas.width / canvas.height, NEAR_PLANE, FAR_PLANE);

  if (gl) {
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
}

/**
 * Compile, link, other option-independent setup
 */
async function setup(event) {
  gl = document.querySelector('canvas').getContext('webgl2',
    // optional configuration object: see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
    { antialias: false, depth: true, preserveDrawingBuffer: true }
  )

  // TODO:::::
  gl.enable(gl.DEPTH_TEST);
  // gl.enable(gl.CULL_FACE);
  // gl.enable(gl.BLEND);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  program = await compileAndLinkGLSL(gl, 'sphere_vertex.glsl', 'sphere_fragment.glsl');
  geom = await setupGeomery(gl, program, generateSphere(20, 20));

  fillScreen();
  requestAnimationFrame(draw);
}

const keysBeingPressed = {};
window.addEventListener('keydown', event => keysBeingPressed[event.key] = true);
window.addEventListener('keyup', event => {
  keysBeingPressed[event.key] = false
  if (event.key == 'f') {
    fogEnabled = !fogEnabled;
  }
});

window.addEventListener('load', setup)
window.addEventListener('resize', fillScreen)

function generateSphere(rings, slices) {
  const latStep = Math.PI / (rings - 1);
  const lngStep = 2 * Math.PI / slices;
  const ind = (i, j) => i * slices + j;

  const positions = [];
  for (let i = 0; i < rings; ++i) {
    for (let j = 0; j < slices; ++j) {
      positions.push([
        Math.sin(i * latStep) * Math.cos(lngStep * j),
        Math.sin(i * latStep) * Math.sin(lngStep * j),
        Math.cos(i * latStep)
      ])
    }
  }

  const triangles = [];
  for (let i = 0; i < rings - 1; ++i) {
    for (let j = 0; j < slices; ++j) {
      triangles.push(
        [ind(i, j), ind(i + 1, j), ind(i, (j + 1) % slices)],
        [ind(i, (j + 1) % slices), ind(i + 1, j), ind(i + 1, (j + 1) % slices)]
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
