const { mat4, vec3 } = glMatrix;

const BOX_SIZE = 500;
const NEAR_PLANE = 10;
const FAR_PLANE = 4 * BOX_SIZE;

/** @type {WebGL2RenderingContext} */ var gl;
/** @type {WebGLProgram} */ var program
var geom;

const m = mat4.create();
const v = mat4.create();
const p = mat4.create();
const camera = vec3.fromValues(BOX_SIZE, -BOX_SIZE, BOX_SIZE);
const center = vec3.fromValues(0, 0, 0);
const up = vec3.fromValues(0, 0, 1);
mat4.lookAt(v, camera, center, up);

const RADIUS = 30


// physics

const particles = Array(50).fill(0).map((_, i) => {
  let position = vec3.fromValues(0, 0, 0);
  // let velocity = vec3.create();
  let velocity = vec3.fromValues(Math.random() * 1000 - 500, Math.random() * 1000 - 500, Math.random() * 1000 - 500);
  return {
    color: new Float32Array([Math.random(), Math.random(), Math.random()]),
    position,
    velocity
  };
});

let time = 0;

const g = vec3.fromValues(0, 0, -9.8);

function drawParticle({ position, velocity, color }, dt) {
  // console.log('draw particle', position, velocity, dt)
  vec3.scaleAndAdd(position, position, velocity, dt);

  for (let i = 0; i < 3; ++i) {
    if (position[i] >= BOX_SIZE/2 && velocity[i] > 0 || position[i] <= -BOX_SIZE/2 && velocity[i] < 0) {
      velocity[i] = -velocity[i];
    }
  }
  vec3.scale(velocity, velocity, 0.99);
  vec3.add(velocity, velocity, g);

  mat4.fromTranslation(m, position);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'm'), false, m);
  gl.vertexAttrib3fv(gl.getAttribLocation(program, 'color'), color);
  gl.drawElements(geom.mode, geom.count, geom.type, 0);
}

/**
 * Draw one frame
 */
function draw(t) {

  const dt = time ? (t - time) / 1000 : 0;
  time = t;

  gl.clearColor(0.5, 0.5, 0.5, 0.5);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!geom) return;

  gl.useProgram(program);
  gl.bindVertexArray(geom.vao);
  gl.uniform3fv(gl.getUniformLocation(program, 'eye'), camera);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'v'), false, v);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p);

  particles.forEach(p => drawParticle(p, 0.016))
}


/**
 * Resizes the canvas to completely fill the screen
 */
function fillScreen(t) {
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
    draw(t)
  }

  requestAnimationFrame(fillScreen);
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
  geom = await setupGeomery(gl, program, generateSphere(20, 20, RADIUS));

  requestAnimationFrame(fillScreen);
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

function generateSphere(rings, slices, RADIUS = BOX_SIZE / 2) {
  const latStep = Math.PI / (rings - 1);
  const lngStep = 2 * Math.PI / slices;
  const ind = (i, j) => i * slices + j;

  const positions = [];
  for (let i = 0; i < rings; ++i) {
    for (let j = 0; j < slices; ++j) {
      positions.push([
        RADIUS * Math.sin(i * latStep) * Math.cos(lngStep * j),
        RADIUS * Math.sin(i * latStep) * Math.sin(lngStep * j),
        RADIUS * Math.cos(i * latStep)
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
