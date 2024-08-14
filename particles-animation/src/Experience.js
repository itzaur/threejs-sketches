import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer';
import * as dat from 'lil-gui';
import vertexShader from './shaders/vertexShader.glsl';
import fragmentShader from './shaders/fragmentShader.glsl';
import fragmentShaderPosition from './shaders/fragmentShaderPosition.glsl';
import fragmentShaderVelocity from './shaders/fragmentShaderVelocity.glsl';
import texture1 from '/4.jpg';
import texture2 from '/6.jpg';
import load from 'load-asset';
import PoissonDiskSampling from 'poisson-disk-sampling';

const options = {
  COUNT: 32 * 2,
};
options.TEXTURE_WIDTH = options.COUNT ** 2;
export default class Experience {
  constructor(container) {
    this.container = container;
    this.width = container.offsetWidth;
    this.height = container.offsetHeight;
    this.mouse = new THREE.Vector2();
    this.gui = new dat.GUI();
    this.parameters = {
      size: 0.04,
    };

    this.points = null;
    this.geometry = null;
    this.material = null;
    this.gpuCompute = null;
    this.positionUniforms = null;
    this.velocityUniforms = null;
    this.positionVariable = null;
    this.velocityVariable = null;
    this.texture1 = null;

    this.resize = () => this.onResize();
    this.mousemove = (e) => this.onMousemovee(e);
  }

  async init() {
    this.points1 = await this.getPoints(texture1);
    this.points2 = await this.getPoints(texture2);

    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();
    this.createControls();
    this.createClock();
    this.createMesh();
    this.initGPU();
    this.addGUI();

    this.addListeners();

    this.renderer.setAnimationLoop(() => {
      this.render();
      this.update();
    });
  }

  createScene() {
    this.scene = new THREE.Scene();
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.width / this.height,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 2);
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.container.appendChild(this.renderer.domElement);
  }

  createLights() {
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    this.scene.add(this.directionalLight);
  }

  createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
  }

  createClock() {
    this.clock = new THREE.Clock();
  }

  async getPoints(url) {
    const image = await load(url);

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = options.COUNT;
    canvas.height = options.COUNT;
    ctx.drawImage(image, 0, 0, options.COUNT, options.COUNT);

    const data = ctx.getImageData(0, 0, options.COUNT, options.COUNT).data;

    let array = new Array(options.COUNT)
      .fill()
      .map(() => new Array(options.COUNT).fill(0));

    for (let i = 0; i < options.COUNT; i++) {
      for (let j = 0; j < options.COUNT; j++) {
        const position = (i + j * options.COUNT) * 4;
        const color = data[position] / 255;
        array[i][j] = color;
      }
    }

    const p = new PoissonDiskSampling({
      shape: [1, 1],
      minDistance: 2 / 400,
      maxDistance: 10 / 400,
      tries: 4,
      distanceFunction: function (point) {
        const indX = Math.floor(point[0] * options.COUNT);
        const indY = Math.floor(point[1] * options.COUNT);

        return array[indX][indY];
      },
      bias: 0,
    });

    let points = p.fill();
    points.sort(() => Math.random() - 0.5);
    points = points.slice(0, options.TEXTURE_WIDTH);

    points = points.map((point) => {
      const indX = Math.floor(point[0] * options.COUNT);
      const indY = Math.floor(point[1] * options.COUNT);

      return [point[0], point[1], array[indX][indY]];
    });

    return points;
  }

  createMesh() {
    if (this.points !== null) {
      this.geometry.dispose();
      this.material.dispose();
      this.scene.remove(this.points);
    }

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: this.parameters.size },
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
        uPositions: { value: null },
        uVelocity: { value: null },
        // uTexture: { value: this.texture1 },
      },
      vertexShader,
      fragmentShader,
      side: 2,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    const positions = new Float32Array(options.TEXTURE_WIDTH * 3);
    const reference = new Float32Array(options.TEXTURE_WIDTH * 2);

    for (let i = 0; i < options.TEXTURE_WIDTH; i++) {
      const i3 = i * 3;

      positions[i3] = (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i3 + 2] = (Math.random() - 0.5) * 0.5;

      reference[i * 2] = (i % options.COUNT) / options.COUNT;
      reference[i * 2 + 1] = Math.floor(i / options.COUNT) / options.COUNT;
    }

    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    this.geometry.setAttribute(
      'reference',
      new THREE.BufferAttribute(reference, 2)
    );

    this.points = new THREE.Points(this.geometry, this.material);

    this.scene.add(this.points);
  }

  fillPositionTexture(texture) {
    const theArray = texture.image.data;

    for (let k = 0, kl = theArray.length; k < kl; k += 4) {
      theArray[k + 0] = (Math.random() - 0.5) * 2;
      theArray[k + 1] = (Math.random() - 0.5) * 2;
      theArray[k + 2] = (Math.random() - 0.5) * 2;
      theArray[k + 3] = 1;
    }
  }

  fillVelocityTexture(texture) {
    const theArray = texture.image.data;

    for (let k = 0, kl = theArray.length; k < kl; k += 4) {
      const x = Math.random() - 0.5;
      const y = Math.random() - 0.5;
      const z = Math.random() - 0.5;

      theArray[k + 0] = x * 0.01;
      theArray[k + 1] = y * 0.01;
      theArray[k + 2] = z * 0.01;
      theArray[k + 3] = 1;
    }
  }

  fillPositionTextureFromPoints(texture, points) {
    const theArray = texture.image.data;

    for (let k = 0, kl = theArray.length; k < kl; k += 4) {
      let i = k / 4;

      if (points[i]) {
        theArray[k + 0] = (points[i][0] - 0.5) * 2;
        theArray[k + 1] = -(points[i][1] - 0.5) * 2;
        theArray[k + 2] = 0;
        theArray[k + 3] = points[i][2];
      }
    }
  }

  initGPU() {
    if (this.gpuCompute !== null) {
      this.gpuCompute.dispose();
    }

    this.gpuCompute = new GPUComputationRenderer(
      options.COUNT,
      options.COUNT,
      this.renderer
    );

    const dtPosition = this.gpuCompute.createTexture();
    const dtPosition1 = this.gpuCompute.createTexture();
    const dtVelocity = this.gpuCompute.createTexture();

    this.fillPositionTextureFromPoints(dtPosition, this.points1);
    this.fillPositionTextureFromPoints(dtPosition1, this.points2);
    // this.fillPositionTexture(dtPosition);
    this.fillVelocityTexture(dtVelocity);

    const target1 = this.gpuCompute.createTexture();
    const target2 = this.gpuCompute.createTexture();
    this.fillPositionTextureFromPoints(target1, this.points1);
    this.fillPositionTextureFromPoints(target2, this.points2);

    this.velocityVariable = this.gpuCompute.addVariable(
      'textureVelocity',
      fragmentShaderVelocity,
      dtVelocity
    );
    this.positionVariable = this.gpuCompute.addVariable(
      'texturePosition',
      fragmentShaderPosition,
      dtPosition
    );

    this.gpuCompute.setVariableDependencies(this.velocityVariable, [
      this.positionVariable,
      this.velocityVariable,
    ]);
    this.gpuCompute.setVariableDependencies(this.positionVariable, [
      this.positionVariable,
      this.velocityVariable,
    ]);

    this.positionUniforms = this.positionVariable.material.uniforms;
    this.velocityUniforms = this.velocityVariable.material.uniforms;

    this.positionUniforms['time'] = { value: 0.0 };
    this.velocityUniforms['time'] = { value: 1.0 };
    this.velocityUniforms['uTarget'] = { value: target1 };

    this.velocityVariable.wrapS = THREE.RepeatWrapping;
    this.velocityVariable.wrapT = THREE.RepeatWrapping;
    this.positionVariable.wrapS = THREE.RepeatWrapping;
    this.positionVariable.wrapT = THREE.RepeatWrapping;

    let modul = 0;

    document.addEventListener('click', () => {
      if (modul == 0) {
        this.velocityUniforms['uTarget'] = { value: target2 };
        modul = 1;
      } else {
        this.velocityUniforms['uTarget'] = { value: target1 };
        modul = 0;
      }
    });

    this.gpuCompute.init();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    const elapsedTime = this.clock.getElapsedTime();

    this.material.uniforms.uTime.value = elapsedTime;

    this.positionUniforms['time'].value = elapsedTime;
    this.velocityUniforms['time'].value = elapsedTime;

    this.material.uniforms.uPositions.value =
      this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
    this.material.uniforms.uVelocity.value =
      this.gpuCompute.getCurrentRenderTarget(this.velocityVariable).texture;

    this.gpuCompute.compute();
  }

  update() {
    this.controls.update();
  }

  addListeners() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('mousemove', this.mousemove);
  }

  onResize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  onMousemovee(e) {
    const x = (e.clientX / this.width) * 2 - 1;
    const y = -((e.clientY / this.height) * 2 - 1);

    this.mouse.set(x, y);
  }

  addGUI() {
    this.gui
      .add(options, 'COUNT')
      .min(32)
      .max(1000)
      .step(100)
      .name('Count')
      .onFinishChange(() => {
        this.createMesh();
        this.initGPU();
      });

    this.gui
      .add(this.parameters, 'size')
      .min(0.01)
      .max(0.5)
      .step(0.01)
      .name('Particles Size')
      .onFinishChange(() => {
        this.createMesh();
      });
  }
}
