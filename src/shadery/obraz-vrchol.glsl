// Jeden trojúhelník přes celou obrazovku (rohy -1,-1 / 3,-1 / -1,3), na něm běží obraz-pixel.glsl.
attribute vec2 aPoz;

void main() {
  gl_Position = vec4(aPoz, 0.0, 1.0);
}
