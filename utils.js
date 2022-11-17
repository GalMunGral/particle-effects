/**
 * @param {WebGL2RenderingContext} gl
 * @param {string} vsUrl path for the vertex shader file
 * @param {string} vsUrl path for the fragment shader file
 * @returns {Promise<WebGLProgram>} the compiled and linked WebGL program
 */
async function compileAndLinkGLSL(gl, vsUrl, fsUrl) {
  const vsSource = await (await fetch(vsUrl)).text();
  const fsSource = await (await fetch(fsUrl)).text();

  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vs));
    throw Error("Vertex shader compilation failed");
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fs));
    throw Error("Fragment shader compilation failed");
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw Error("Linking failed");
  }
  return program;
}

/**
 * Builds the Vertex Array Object from a JSON file specifying the geometry
 * @param {WebGL2RenderingContext} gl
 * @param {Object} geom geometry JSON
 */
async function setupGeomery(gl, program, geom) {
  const triangleArray = gl.createVertexArray();
  gl.bindVertexArray(triangleArray);

  Object.entries(geom.attributes).forEach(([name, data]) => {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const f32 = new Float32Array(data.flat());
    gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(program, name);
    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
  });

  // const indices = new Uint16Array(geom.triangles.flat());
  const indices = new Uint32Array(geom.triangles.flat());
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return {
    mode: gl.TRIANGLES,
    count: indices.length,
    // type: gl.UNSIGNED_SHORT,
    type: gl.UNSIGNED_INT,
    vao: triangleArray,
  };
}
