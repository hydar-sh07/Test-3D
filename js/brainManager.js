import * as THREE from 'three';

export async function createBrainNetwork(scene) {
    const brainGroup = new THREE.Group();
    const nodes = [];
    const connections = [];
    const adjacencyList = {};

    const nodeGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const colorPalette = [0x00f0ff, 0xff007f, 0x8a2be2, 0x00ff88, 0xffaa00, 0x38bdf8];

    try {
        const response = await fetch('./data/brainData.json');
        const data = await response.json();

        data.nodes.forEach((nodeData) => {
            const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            const nodeMaterial = new THREE.MeshStandardMaterial({ 
                color: randomColor,
                emissive: randomColor,
                emissiveIntensity: 0.8,
                roughness: 0.2,
                metalness: 0.9
            });

            const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
            node.position.set(nodeData.x, nodeData.y, nodeData.z);
            node.userData = { 
                id: nodeData.id, 
                lobe: nodeData.lobe,
                voltage: 0.0,
                threshold: 1.0,
                baseColor: randomColor
            };

            brainGroup.add(node);
            nodes.push(node);
            adjacencyList[nodeData.id] = [];
        });

        const pulseSegmentGeo = new THREE.BufferGeometry();
        pulseSegmentGeo.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 0,0,0], 3));

        data.edges.forEach(edge => {
            const startNode = nodes[edge.source];
            const endNode = nodes[edge.target];

            if (startNode && endNode) {
                adjacencyList[edge.source].push(edge.target);
                adjacencyList[edge.target].push(edge.source);

                const points = [startNode.position, endNode.position];
                const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                const baseLineMat = new THREE.LineBasicMaterial({ 
                    color: 0x00f0ff, 
                    transparent: true, 
                    opacity: 0.25 
                });
                const baseLine = new THREE.Line(lineGeo, baseLineMat);
                brainGroup.add(baseLine);

                const pulseMat = new THREE.LineBasicMaterial({ 
                    color: 0xffffff, 
                    transparent: true, 
                    opacity: 0.9,
                    linewidth: 2
                });
                const pulseMesh = new THREE.Line(pulseSegmentGeo.clone(), pulseMat);
                brainGroup.add(pulseMesh);

                connections.push({
                    startId: edge.source,
                    endId: edge.target,
                    start: startNode.position,
                    end: endNode.position,
                    pulseMesh: pulseMesh,
                    progress: Math.random(),
                    speed: 0.008 + Math.random() * 0.012,
                    activeSpike: false
                });
            }
        });

    } catch (error) {
        console.error("Error loading brain dataset:", error);
    }

    scene.add(brainGroup);
    return { brainGroup, nodes, connections, adjacencyList };
}