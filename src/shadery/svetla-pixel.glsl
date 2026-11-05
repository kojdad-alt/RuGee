// Jedno světlo: uvnitř jádra naplno, od jádra k okraji kruhu rovnoměrně slábne, za okrajem nic. Do mapy se píše
// polovina (8bitová textura udrží 0–1, takže světlo může jít až do 2 = přezáření u výbuchů).
precision mediump float;

varying vec2 vRoh;
varying vec4 vBarva;

void main() {
  float d = length(vRoh);
  if (d >= 1.0) discard;
  float sila = clamp((1.0 - d) / max(1.0 - vBarva.a, 0.001), 0.0, 1.0);
  gl_FragColor = vec4(vBarva.rgb * sila * 0.5, 1.0);
}
