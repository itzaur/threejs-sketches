import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer';
import * as dat from 'lil-gui';
import vertexShader from './shaders/vertexShader.glsl';
import fragmentShader from './shaders/fragmentShader.glsl';
import fragmentShaderPosition from './shaders/fragmentShaderPosition.glsl';
import fragmentShaderVelocity from './shaders/fragmentShaderVelocity.glsl';

export default class Experience {
  constructor(container) {
    this.container = container;
    this.width = container.offsetWidth;
    this.height = container.offsetHeight;
    this.mouse = new THREE.Vector2();
    this.gui = new dat.GUI();
    this.parameters = {
      GPGPUParticlesCount: 32,
      count: 1000,
      size: 0.05,
    };
    this.parameters.textureWidth = this.parameters.GPGPUParticlesCount ** 2;

    this.points = null;
    this.geometry = null;
    this.material = null;
    this.gpuCompute = null;
    this.positionUniforms = null;
    this.velocityUniforms = null;
    this.positionVariable = null;
    this.velocityVariable = null;

    this.resize = () => this.onResize();
    this.mousemove = (e) => this.onMousemovee(e);
  }

  init() {
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
      },
      vertexShader,
      fragmentShader,
      side: 2,
      depthWrite: false,
      transparent: true,
    });

    const positions = new Float32Array(this.parameters.GPGPUParticlesCount * 3);
    const reference = new Float32Array(this.parameters.GPGPUParticlesCount * 2);

    for (let i = 0; i < this.parameters.GPGPUParticlesCount; i++) {
      const i3 = i * 3;

      positions[i3] = (Math.random() - 0.5) * 5;
      positions[i3 + 1] = (Math.random() - 0.5) * 5;
      positions[i3 + 2] = (Math.random() - 0.5) * 5;

      reference[i * 2] =
        (i % this.parameters.GPGPUParticlesCount) /
        this.parameters.GPGPUParticlesCount;
      reference[i * 2 + 1] =
        Math.floor(i / this.parameters.GPGPUParticlesCount) /
        this.parameters.GPGPUParticlesCount;
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

  initGPU() {
    if (this.gpuCompute !== null) {
      this.gpuCompute.dispose();
    }

    this.gpuCompute = new GPUComputationRenderer(
      this.parameters.GPGPUParticlesCount,
      this.parameters.GPGPUParticlesCount,
      this.renderer
    );

    const dtPosition = this.gpuCompute.createTexture();
    const dtVelocity = this.gpuCompute.createTexture();
    this.fillPositionTexture(dtPosition);
    this.fillVelocityTexture(dtVelocity);

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

    this.velocityVariable.wrapS = THREE.RepeatWrapping;
    this.velocityVariable.wrapT = THREE.RepeatWrapping;
    this.positionVariable.wrapS = THREE.RepeatWrapping;
    this.positionVariable.wrapT = THREE.RepeatWrapping;

    this.gpuCompute.init();
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
      .add(this.parameters, 'GPGPUParticlesCount')
      .min(32)
      .max(10000)
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
