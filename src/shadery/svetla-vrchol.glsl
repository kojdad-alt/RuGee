// Světla do světelné mapy (osvetleni.js): každé světlo je čtverec kolem svého středu (dva trojúhelníky) a světla
// se sčítají (blendFunc ONE, ONE). Souřadnice jsou v px obrazovky (y dolů), světelná mapa je menší (pixel = pixel
// spritu), o zmenšení se postará viewport.
attribute vec2 aRoh;      // roh čtverce: -1 až 1
attribute vec3 aSvetlo;   // střed x, y (px) a poloměr (px)
attribute vec4 aBarva;    // barva krát síla (rgb) a jádro (a): do jaké části poloměru svítí naplno

uniform vec2 uObrazovka;  // kolik px obrazovky mapa pokrývá (šířka a výška mapy krát pixel spritu)

varying vec2 vRoh;
varying vec4 vBarva;

void main() {
  vec2 px = aSvetlo.xy + aRoh * aSvetlo.z;
  vec2 clip = px / uObrazovka * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vRoh = aRoh;
  vBarva = aBarva;
}
