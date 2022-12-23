use std::convert::TryInto;

use js_sys::{Float32Array, Uint32Array};
use wasm_bindgen::JsValue;
use web_sys::{WebGl2RenderingContext, WebGlProgram, WebGlShader, WebGlVertexArrayObject};

use super::web::fetch_str;

pub async fn load_shaders(
    gl: &WebGl2RenderingContext,
    vs_url: &str,
    fs_url: &str,
) -> Result<WebGlProgram, JsValue> {
    let vertex_shader = load_and_compile_shader(
        gl,
        &fetch_str(vs_url).await?,
        WebGl2RenderingContext::VERTEX_SHADER,
    )?;
    let fragment_shader = load_and_compile_shader(
        gl,
        &fetch_str(fs_url).await?,
        WebGl2RenderingContext::FRAGMENT_SHADER,
    )?;
    link_shaders(gl, &vertex_shader, &fragment_shader)
}

#[derive(Debug)]
pub struct Geometry {
    pub triangles: Vec<u32>,
    pub attributes: VertexAttrs,
}

#[derive(Debug)]
pub struct VertexAttrs {
    pub position: VertexAttrInfo,
    pub normal: Option<VertexAttrInfo>,
    pub texcoord: Option<VertexAttrInfo>,
}

#[derive(Debug)]
pub struct VertexAttrInfo {
    pub glsl_name: String,
    pub size: i32,
    pub data: Vec<f32>,
}

pub fn setup_geometry(
    gl: &WebGl2RenderingContext,
    program: &WebGlProgram,
    geometry: &Geometry,
) -> Result<WebGlVertexArrayObject, JsValue> {
    let vao = gl
        .create_vertex_array()
        .ok_or("failed to create vertex array object")?;
    gl.bind_vertex_array(Some(&vao));

    setup_attr(gl, program, &geometry.attributes.position)?;

    if let Some(ref attr) = geometry.attributes.normal {
        setup_attr(gl, program, attr)?;
    }
    if let Some(ref attr) = geometry.attributes.texcoord {
        setup_attr(gl, program, attr)?;
    }

    let index_buffer = gl.create_buffer().ok_or("failed to create buffer")?;
    gl.bind_buffer(
        WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER,
        Some(&index_buffer),
    );
    unsafe {
        gl.buffer_data_with_array_buffer_view(
            WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER,
            &Uint32Array::view(&geometry.triangles),
            WebGl2RenderingContext::STATIC_DRAW,
        );
    }
    Ok(vao)
}

fn setup_attr(
    gl: &WebGl2RenderingContext,
    program: &WebGlProgram,
    attr: &VertexAttrInfo,
) -> Result<(), JsValue> {
    let attr_loc: u32 = gl
        .get_attrib_location(program, &attr.glsl_name)
        .try_into()
        .map_err(|_| "invalid attribute name")?;
    let buffer = gl.create_buffer().ok_or("failed to create buffer")?;
    gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&buffer));
    unsafe {
        gl.buffer_data_with_array_buffer_view(
            WebGl2RenderingContext::ARRAY_BUFFER,
            &Float32Array::view(&attr.data),
            WebGl2RenderingContext::STATIC_DRAW,
        );
    }
    gl.vertex_attrib_pointer_with_i32(
        attr_loc,
        attr.size,
        WebGl2RenderingContext::FLOAT,
        false,
        0,
        0,
    );
    gl.enable_vertex_attrib_array(attr_loc);
    Ok(())
}

fn link_shaders(
    gl: &WebGl2RenderingContext,
    vertex_shader: &WebGlShader,
    fragment_shader: &WebGlShader,
) -> Result<WebGlProgram, JsValue> {
    let program = gl.create_program().ok_or("failed_to_create_program")?;
    gl.attach_shader(&program, vertex_shader);
    gl.attach_shader(&program, fragment_shader);
    gl.link_program(&program);

    if gl
        .get_program_parameter(&program, WebGl2RenderingContext::LINK_STATUS)
        .as_bool()
        .ok_or("failed to get link status")?
    {
        Ok(program)
    } else {
        Err(gl
            .get_program_info_log(&program)
            .unwrap_or(String::from("failed to get shader info log"))
            .into())
    }
}

fn load_and_compile_shader(
    gl: &WebGl2RenderingContext,
    shader_src: &str,
    shader_type: u32,
) -> Result<WebGlShader, JsValue> {
    let shader = gl
        .create_shader(shader_type)
        .ok_or("failed to create shader")?;
    gl.shader_source(&shader, shader_src);
    gl.compile_shader(&shader);

    if gl
        .get_shader_parameter(&shader, WebGl2RenderingContext::COMPILE_STATUS)
        .as_bool()
        .ok_or("failed to get COMPILE_STATUS")?
    {
        Ok(shader)
    } else {
        Err(gl
            .get_shader_info_log(&shader)
            .unwrap_or(String::from("failed to get shader info log"))
            .into())
    }
}
