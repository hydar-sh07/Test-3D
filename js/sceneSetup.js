import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

export function setupScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010103, 0.04);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.6,
        0.4,
        0.8
    );

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    const spaceGroup = new THREE.Group();
    const glowTexture = createGlowTexture();

    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 2000;
    const starPos = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
        starPos[i] = (Math.random() - 0.5) * 120;
        starPos[i + 1] = (Math.random() - 0.5) * 120;
        starPos[i + 2] = (Math.random() - 0.5) * 120;
    }

    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({
        color: 0x00f0ff,
        size: 0.15,
        map: glowTexture,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
    });
    const starField = new THREE.Points(starsGeo, starsMat);
    spaceGroup.add(starField);

    const dustColors = [0x7928ca, 0x00dfd8, 0xff0080, 0x0070f3];
    dustColors.forEach((colorHex, idx) => {
        const dustGeo = new THREE.BufferGeometry();
        const count = 250;
        const pos = new Float32Array(count * 3);

        for (let i = 0; i < count * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * 40 + (idx * 4 - 6);
            pos[i + 1] = (Math.random() - 0.5) * 40;
            pos[i + 2] = (Math.random() - 0.5) * 40 - (idx * 5);
        }

        dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const dustMat = new THREE.PointsMaterial({
            color: colorHex,
            size: 1.8,
            map: glowTexture,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const dustMesh = new THREE.Points(dustGeo, dustMat);
        spaceGroup.add(dustMesh);
    });

    scene.add(spaceGroup);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer, controls, starField, spaceGroup, composer };
}