import * as THREE from 'three';
import { setupScene } from './sceneSetup.js';
import { createBrainNetwork } from './brainManager.js';

const { scene, camera, renderer, controls, starField, spaceGroup, composer } = setupScene();

let lastTime = performance.now();
let frameCount = 0;
const fpsValElement = document.getElementById('fps-val');

let pulseSpeedMultiplier = 1.0;
let bgThemes = [
    { bg: 0x010103, star: 0x00f0ff, name: "Deep Cyber Void" },
    { bg: 0x0a0315, star: 0xff88ff, name: "Supernova Nebula" },
    { bg: 0x021008, star: 0x00ff88, name: "Matrix Bio-Connectome" }
];
let currentThemeIdx = 0;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let nodes = [];
let connections = [];
let adjacencyList = {};
let brainGroup = null;

async function initProject() {
    const network = await createBrainNetwork(scene);
    brainGroup = network.brainGroup;
    nodes = network.nodes;
    connections = network.connections;
    adjacencyList = network.adjacencyList;
}

initProject();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodes);

    if (intersects.length > 0) {
        const hitNode = intersects[0].object;
        injectVoltage(hitNode.userData.id, 1.5);
        document.getElementById('node-title').innerText = `Neuron #${hitNode.userData.id + 1} Fired! ⚡`;
        document.getElementById('node-desc').innerText = `Lobe: ${hitNode.userData.lobe}. SNN Voltage injected, triggering cascade!`;
    }
});

function injectVoltage(nodeId, amount) {
    const node = nodes[nodeId];
    if (!node) return;

    node.userData.voltage += amount;

    if (node.userData.voltage >= node.userData.threshold) {
        node.material.color.setHex(0xffffff);
        node.material.emissive.setHex(0x00f0ff);
        node.material.emissiveIntensity = 4.0;

        const neighbors = adjacencyList[nodeId] || [];
        neighbors.forEach(neighborId => {
            connections.forEach(conn => {
                if ((conn.startId === nodeId && conn.endId === neighborId) ||
                    (conn.startId === neighborId && conn.endId === nodeId)) {
                    conn.activeSpike = true;
                    conn.progress = 0.0;
                }
            });

            setTimeout(() => {
                injectVoltage(neighborId, 0.6);
            }, 180);
        });

        setTimeout(() => {
            node.userData.voltage = 0.0;
            node.material.color.setHex(node.userData.baseColor);
            node.material.emissive.setHex(node.userData.baseColor);
            node.material.emissiveIntensity = 0.8;
        }, 300);
    }
}

document.getElementById('fire-all-btn').addEventListener('click', () => {
    nodes.forEach(node => injectVoltage(node.userData.id, 1.5));
    document.getElementById('node-desc').innerText = "All neurons stimulated simultaneously! SNN Cascade Active.";
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetLobe = e.target.getAttribute('data-lobe');
        nodes.forEach(node => {
            if (targetLobe === 'All' || node.userData.lobe === targetLobe) {
                node.visible = true;
            } else {
                node.visible = false;
            }
        });
        document.getElementById('node-desc').innerText = `Filtered view: ${targetLobe} Lobes.`;
    });
});

document.getElementById('bg-btn').addEventListener('click', () => {
    currentThemeIdx = (currentThemeIdx + 1) % bgThemes.length;
    const theme = bgThemes[currentThemeIdx];
    scene.background = new THREE.Color(theme.bg);
    scene.fog.color = new THREE.Color(theme.bg);
    starField.material.color.setHex(theme.star);
    document.getElementById('node-desc').innerText = `Theme switched to: ${theme.name}`;
});

document.getElementById('pulse-btn').addEventListener('click', () => {
    pulseSpeedMultiplier = pulseSpeedMultiplier === 1.0 ? 2.5 : 1.0;
    document.getElementById('node-desc').innerText = `Pulse speed: ${pulseSpeedMultiplier > 1 ? 'High Frequency ⚡' : 'Normal'}`;
});

document.getElementById('reset-btn').addEventListener('click', () => {
    camera.position.set(0, 0, 3.2);
    controls.reset();
    nodes.forEach(n => {
        n.userData.voltage = 0;
        n.visible = true;
        n.material.emissiveIntensity = 0.8;
    });
    document.getElementById('node-desc').innerText = "Camera view & neural states reset successfully.";
});

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    frameCount++;
    if (now >= lastTime + 1000) {
        if (fpsValElement) {
            fpsValElement.innerText = Math.round((frameCount * 1000) / (now - lastTime));
        }
        frameCount = 0;
        lastTime = now;
    }

    const time = now * 0.001;

    if (brainGroup) {
        brainGroup.rotation.y += 0.002;
        brainGroup.rotation.x = Math.sin(time * 0.4) * 0.05;
    }

    if (spaceGroup) {
        spaceGroup.rotation.y -= 0.0003;
    }

    connections.forEach(conn => {
        const speed = conn.activeSpike ? conn.speed * 3.0 : conn.speed * pulseSpeedMultiplier;
        conn.progress += speed;
        if (conn.progress > 1.0) {
            conn.progress = 0.0;
            conn.activeSpike = false;
        }

        const pLength = conn.activeSpike ? 0.4 : 0.25;
        const headProgress = conn.progress;
        const tailProgress = Math.max(0, conn.progress - pLength);

        const p1 = new THREE.Vector3().lerpVectors(conn.start, conn.end, tailProgress);
        const p2 = new THREE.Vector3().lerpVectors(conn.start, conn.end, headProgress);

        const posAttr = conn.pulseMesh.geometry.attributes.position;
        posAttr.setXYZ(0, p1.x, p1.y, p1.z);
        posAttr.setXYZ(1, p2.x, p2.y, p2.z);
        posAttr.needsUpdate = true;
    });

    nodes.forEach((node, index) => {
        const pulseFactor = node.userData.voltage > 0 ? 0.4 : 0.2;
        const scale = 1 + Math.sin(time * 4 * pulseSpeedMultiplier + index * 0.5) * pulseFactor;
        node.scale.set(scale, scale, scale);
    });

    controls.update();
    composer.render();
}

animate();
console.log("Spiking Neural Network (SNN) Simulation loaded successfully!");