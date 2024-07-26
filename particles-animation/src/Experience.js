import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import * as dat from 'lil-gui';
import vertexShader from './shaders/vertexShader.glsl';
import fragmentShader from './shaders/fragmentShader.glsl';

export default class Experience {
  constructor(container) {
    this.container = container;
    this.width = container.offsetWidth;
    this.height = container.offsetHeight;
    this.mouse = new THREE.Vector2();
    this.gui = new dat.GUI();
    this.parameters = {
      count: 1000,
    };
    this.points = null;
    this.geometry = null;
    this.material = null;

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
      },
      vertexShader,
      fragmentShader,
      side: 2,
      depthWrite: false,
      transparent: true,
    });

    const positions = new Float32Array(this.parameters.count * 3);

    for (let i = 0; i < this.parameters.count; i++) {
      const i3 = i * 3;

      positions[i3] = (Math.random() - 0.5) * 5;
      positions[i3 + 1] = (Math.random() - 0.5) * 5;
      positions[i3 + 2] = (Math.random() - 0.5) * 5;
    }

    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    this.points = new THREE.Points(this.geometry, this.material);

    this.scene.add(this.points);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    const elapsedTime = this.clock.getElapsedTime();

    this.material.uniforms.uTime.value = elapsedTime;
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
      .add(this.parameters, 'count')
      .min(0)
      .max(10000)
      .step(100)
      .name('count')
      .onFinishChange(() => {
        this.createMesh();
      });
  }
}
