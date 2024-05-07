import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import vertexShader from './shaders/vertexShader.glsl';
import fragmentShader from './shaders/fragmentShader.glsl';
import vertexShaderFBO from './shaders/vertexShaderFBO.glsl';
import fragmentShaderFBO from './shaders/fragmentShaderFBO.glsl';
import texture from '/particles-single.png';

console.log(texture);

export default class Experience {
  constructor(container) {
    this.container = container;
    this.width = container.offsetWidth;
    this.height = container.offsetHeight;

    this.resize = () => this.onResize();
    this.mouseMove = (e) => this.onMouseMove(e);

    this.whiteTarget = new THREE.WebGLRenderTarget(this.width, this.height);

    this.whiteScene = new THREE.Scene();
    this.whiteBackground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.whiteScene.add(this.whiteBackground);
    this.whiteBackground.position.z = -1;

    this.box = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    this.whiteScene.add(this.box);
  }

  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createControls();
    this.createClock();
    this.createRaycaster();
    this.setupPipeline();

    this.addListeners();

    this.renderer.setAnimationLoop(() => {
      this.render();
      this.update();
    });
  }

  createScene() {
    this.scene = new THREE.Scene();
  }

  createWhiteScene() {
    this.whiteTarget = new THREE.WebGLRenderTarget(this.width, this.height);

    this.whiteScene = new THREE.Scene();
    this.whiteBackground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.whiteScene.add(this.whiteBackground);
    this.whiteBackground.position.z = -1;

    this.box = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    this.whiteScene.add(this.box);
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
    this.controls.enabled = false;
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.container.appendChild(this.renderer.domElement);
  }

  createClock() {
    this.clock = new THREE.Clock();
  }

  createRaycaster() {
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.intersects = [];

    this.raycastPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ color: 0xff0000, side: 2 })
    );

    this.cursor = new THREE.Mesh(
      // new THREE.PlaneGeometry(0.3, 0.3, 20, 20),
      new THREE.SphereGeometry(0.2, 30, 30),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        // map: new THREE.TextureLoader().load(texture),
        // transparent: true,
      })
    );

    this.scene.add(this.cursor);
  }

  setupPipeline() {
    this.sourceTarget = new THREE.WebGLRenderTarget(this.width, this.height);

    this.targetA = new THREE.WebGLRenderTarget(this.width, this.height);
    this.targetB = new THREE.WebGLRenderTarget(this.width, this.height);

    this.renderer.setRenderTarget(this.whiteTarget);
    this.renderer.render(this.whiteScene, this.camera);

    this.fboScene = new THREE.Scene();
    this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fboMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uPrevTexture: { value: this.whiteTarget.texture },
        uResolution: {
          value: new THREE.Vector4(this.width, this.height, 1, 1),
        },
        uTime: { value: 0 },
      },
      vertexShader: vertexShaderFBO,
      fragmentShader: fragmentShaderFBO,
    });

    this.fboQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.fboMaterial
    );
    this.fboScene.add(this.fboQuad);

    //Final Scene
    this.finalScene = new THREE.Scene();
    this.finalQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: this.targetA.texture })
    );
    this.finalScene.add(this.finalQuad);
  }

  render() {
    this.renderer.setRenderTarget(this.sourceTarget);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(this.targetA);
    this.renderer.render(this.fboScene, this.fboCamera);

    this.fboMaterial.uniforms.uTexture.value = this.sourceTarget.texture;
    this.fboMaterial.uniforms.uPrevTexture.value = this.targetA.texture;
    this.fboMaterial.uniforms.uTime.value = this.clock.getElapsedTime();

    //Final output
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.finalScene, this.fboCamera);

    //Swap textures
    let temp = this.targetA;
    this.targetA = this.targetB;
    this.targetB = temp;
  }

  update() {
    this.controls.update();
  }

  addListeners() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('mousemove', this.mouseMove);
  }

  onResize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  onMouseMove(e) {
    const x = (e.clientX / this.width) * 2 - 1;
    const y = -(e.clientY / this.height) * 2 + 1;

    this.mouse.set(x, y);

    this.raycaster.setFromCamera(this.mouse, this.camera);

    this.intersects = this.raycaster.intersectObjects([this.raycastPlane]);

    if (this.intersects.length > 0) {
      this.cursor.position.copy(this.intersects[0].point);
    }
  }
}
