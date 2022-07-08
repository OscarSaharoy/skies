// Oscar Saharoy 2022


export const skyVert = `

// ====================================================================================

varying vec3 vNormal;

void main() {
	
    gl_Position = projectionMatrix 
				* modelViewMatrix 
				* vec4( position, 1.0 );
    vNormal     = normal;
}

// ====================================================================================

`; export const skyFrag = `

// ====================================================================================

uniform float uTime;
uniform vec2 uResolution;
uniform float uZoom;

varying vec3 vNormal;

#define PI 3.14159265
#define UP vec3(0, 1, 0)
#define DOWN vec3(0, -1, 0)

float saturate( float x ) {
	return clamp( x, 0., 1. );
}

float hash13(vec3 p3) {

	p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

float hash( float x ) {
	return hash13( vec3(x) );
}


vec3 hash3( vec3 p ) {

    vec3 q = vec3( 
		dot( p, vec3(127.1,311.7,432.2) ), 
		dot( p, vec3(269.5,183.3,847.6) ), 
		dot( p, vec3(419.2,371.9,927.0) )
	);

    return fract(sin(q)*43758.5453);
}

//	Simplex 3D Noise 
//	by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

vec3 simplexNoise3(vec3 pos) {
    
    return vec3(
        snoise( pos ),
        snoise( pos + vec3(1,2,3) ),
        snoise( pos + vec3(-4,5,-6) )        
    );
}

vec3 dirToCellUV( vec3 dir,
		float bandOffset, float cellOffset ) {

	float bandHeight = 0.05;
	float phi = acos( dot( UP, dir ) );
	float band = floor( phi / bandHeight ) 
		       * bandHeight + bandOffset * bandHeight;

	float areaMiddle = bandHeight * bandHeight;
	float topHeight = cos( band );
	float bottomHeight = cos( band + bandHeight );
	float bandArea = 2. * PI 
				   * ( topHeight - bottomHeight );
	float divisions = floor( bandArea / areaMiddle );

	float theta = atan( -dir.x, -dir.z ) + PI;
	float cellLength = 2. * PI / divisions;
	float cell = floor( theta / cellLength ) 
			   * cellLength + cellOffset * cellLength;

	vec3 cellCoords = vec3(band, cell, 0.); 

	float phic = (phi - band) / bandHeight;
	float thetac = (theta - cell) / cellLength;

	vec3 celluv = vec3(
		phic - .5,
		thetac - .5,
		hash( hash(band) + cell )
	);

	return celluv;
}

vec3 starFunction( vec3 celluv ) {

	return vec3(saturate(
		.1 - length(celluv)
	)) * 10.;
}

vec3 starLight( vec3 viewDir, 
		float bandOffset, float cellOffset ) {

	float bandHeight = 0.05;
	float phi = acos( dot( UP, viewDir ) );
	float band = floor( phi / bandHeight ) 
		       * bandHeight + bandOffset * bandHeight;

	float areaMiddle = bandHeight * bandHeight;
	float topHeight = cos( band );
	float bottomHeight = cos( band + bandHeight );
	float bandArea = 2. * PI 
				   * ( topHeight - bottomHeight );
	float divisions = floor( bandArea / areaMiddle );

	float theta = atan( -viewDir.x, -viewDir.z ) + PI;
	float cellLength = 2. * PI / divisions;
	float cell = floor( theta / cellLength ) 
			   * cellLength + cellOffset * cellLength;

	vec3 cellCoords = vec3(band, cell, 0.); 

	float phic = (phi - band) / bandHeight;
	float thetac = (theta - cell) / cellLength;

	vec3 celluv = vec3( phic - .5, thetac - .5, 0. );
	float jitter = .75;
	celluv += (hash3( cellCoords ) - .5)
			* vec3(jitter, jitter, 0.);
	
	float poleMask = step( bandHeight, phi );

	return vec3(saturate(
		.1 - length(celluv)
	)) * 10. * poleMask;
	return celluv;

	float brightness = pow( 
		hash13( cellCoords * 50. ), .2
	);

	return vec3(
		saturate(
			- .1 +
			1.1 / length(50. * celluv * sqrt(uZoom)
				         / (1.-brightness))
		) 
		* poleMask
	);
}


void main() {

    vec3 viewDir = normalize(vNormal);
    
    vec3 black = vec3(0);
    vec3 blue = vec3(0, 112, 147) / 255.;
    vec3 up = vec3(0, 1, 0);
    float upness = dot(viewDir, up)
				 + hash13( viewDir * 1000. ) * .06;

    gl_FragColor.rgb = mix(black, blue, pow(11., -upness)) * .3;
    gl_FragColor.a = 1.;

	for( float bo=-1.; bo<1.1; ++bo)
	for( float co=-1.; co<1.1; ++co) {
		vec3 celluv = dirToCellUV( viewDir, bo, co );

		float jitter = .75;
		celluv += (vec3(1.) - .5)
				* vec3(jitter, jitter, 0.);

		gl_FragColor.rgb += starFunction( celluv );
	}
}

// ====================================================================================

`;

