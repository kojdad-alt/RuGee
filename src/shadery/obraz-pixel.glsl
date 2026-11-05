// Jeden průchod přes obrazovku: ze světelné mapy udělá dvě poloviny plátna, které kresleni.js položí na hotový
// obraz hry. Levá polovina se násobí (tma a viněta, plátno 2D 'multiply'), pravá přičítá (záře světel, barva tmy
// a okrajů, 'lighter'). Obě jsou ve velikosti světelné mapy a zvětší se bez vyhlazení, takže okraj světla má
// schody po pixelu spritu jako všechno ostatní.
precision mediump float;

uniform sampler2D uSvetla;  // světelná mapa (světla sečtená napůl, viz svetla-pixel.glsl)
uniform vec2 uMapa;         // šířka a výška světelné mapy v jejích pixelech
uniform vec2 uObrazovka;    // kolik px obrazovky mapa pokrývá (šířka a výška mapy krát pixel spritu)
uniform vec2 uStred;        // střed obrazovky v px (y odspodu jako gl_FragCoord)
uniform float uTma;         // síla tmy (jeskyně 0,84, hřbitov 0,62, jinde 0)
uniform vec3 uBarvaTmy;     // do jaké barvy tmavne
uniform float uSchody;      // na kolik schodů se světlo zaokrouhlí (4 = jako tma bez světel)
uniform float uZare;        // kolik ze světla se přičte navíc (záře ohně, lávy, výbuchů)
uniform float uPrezar;      // kolik ze světla nad 1 se přičte (přezáření: výbuch, lucerna těsně u hrdiny)
uniform vec4 uVineta;       // barva okrajů (rgb) a jejich síla (a)
uniform vec2 uVinetaOd;     // od kolika px od středu okraje tmavnou a kde jsou nejtmavší

void main() {
  bool pricist = gl_FragCoord.x >= uMapa.x;
  vec2 uv = vec2(pricist ? gl_FragCoord.x - uMapa.x : gl_FragCoord.x, gl_FragCoord.y) / uMapa;
  vec3 svetlo = texture2D(uSvetla, uv).rgb * 2.0;

  // Světlo po schodech: nejsilnější složka se zaokrouhlí nahoru na celý schod, barva světla zůstane. Stejně po
  // schodech je i přezáření (světlo nad 1), takže ani záře není rozmazaná.
  float nejvic = max(max(svetlo.r, svetlo.g), svetlo.b);
  vec3 barva = nejvic > 0.0 ? svetlo / nejvic : vec3(0.0);
  vec3 osvit = barva * (ceil(min(nejvic, 1.0) * uSchody - 0.01) / uSchody);
  float nad = ceil(max(nejvic - 1.0, 0.0) * uSchody - 0.01) / uSchody;
  vec3 tma = uTma * (1.0 - osvit);

  // Viněta: stejná jako ztmavení okrajů bez světel (od uVinetaOd.x do uVinetaOd.y px od středu).
  float v = clamp((length(uv * uObrazovka - uStred) - uVinetaOd.x) / (uVinetaOd.y - uVinetaOd.x), 0.0, 1.0) * uVineta.a;

  vec3 nasobit = (1.0 - tma) * (1.0 - v);
  // Záře je shora omezená, ať se ani pod hromadou ohně a výbuchů nerozsvítí hrdina do bílé skvrny.
  vec3 zare = min(osvit * uZare + barva * nad * uPrezar, vec3(0.3));
  vec3 pricti = (uBarvaTmy * tma + zare) * (1.0 - v) + uVineta.rgb * v;
  gl_FragColor = vec4(pricist ? pricti : nasobit, 1.0);
}
