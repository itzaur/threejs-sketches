import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import vertexShader from './shaders/vertexShader.glsl';
import fragmentShader from './shaders/fragmentShader.glsl';

export default class Experience {
  constructor(container) {
    this.container = container;
    this.width = container.offsetWidth;
    this.height = container.offsetHeight;

    this.resize = () => this.onResize();
  }

  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createMesh();
    this.createControls();
    this.createClock();

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
      1000
    );
    this.camera.position.z = 5;
  }

  createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.container.appendChild(this.renderer.domElement);

    this.renderer.setClearColor(0x000000);
  }

  createMesh() {
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  createClock() {
    this.clock = new THREE.Clock();
  }

  render() {
    this.renderer.render(this.scene, this.camera);

    const elapsedTime = this.clock.getElapsedTime();

    this.material.uniforms.uTime.value = elapsedTime;

    this.mesh.rotation.x = Math.sin(elapsedTime);
    this.mesh.rotation.y = Math.cos(elapsedTime);
  }

  update() {
    this.controls.update();
  }

  addListeners() {
    window.addEventListener('resize', this.resize);
  }

  onResize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}
