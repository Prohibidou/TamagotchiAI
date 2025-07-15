import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- Global variables ---
let camera, scene, renderer, mixer;
const clock = new THREE.Clock();
let pet; // This will hold our dragon model
let screenBounds;

// --- Pet properties ---
const petState = {
  IDLE: 'idle',
  FLYING: 'flying',
};
let currentState = petState.IDLE;
const petSize = 50; // Used for boundary checks
const moveSpeed = 1;

// --- Main initialization function ---
function init() {
  // --- Screen-dependent variables ---
  screenBounds = {
    left: (-window.innerWidth / 2) + petSize,
    right: (window.innerWidth / 2) - petSize,
    top: (window.innerHeight / 2) - petSize,
    bottom: (-window.innerHeight / 2) + petSize,
  };

  // --- Basic setup ---
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 250;

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // --- Lighting ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  // --- Load the 3D Model ---
  const loader = new GLTFLoader();
  loader.load(
    './source/Dragon.glb',
    function (gltf) {
      pet = gltf.scene;

      // --- Animation setup ---
      mixer = new THREE.AnimationMixer(pet);
      pet.actionClips = {}; // Use an object to store actions by name

      if (gltf.animations.length > 0) {
        gltf.animations.forEach(clip => {
          const action = mixer.clipAction(clip);
          pet.actionClips[clip.name] = action;
        });

        // Start the flying animation and keep it running
        if (pet.actionClips.flying) {
          pet.actionClips.flying.play();
        }
      }

      // --- Auto-center and scale the model ---
      const box = new THREE.Box3().setFromObject(pet);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Rescale model to a standard size
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 150 / maxDim;
      pet.scale.set(scale, scale, scale);

      // Center the model and set initial position
      pet.position.sub(center.multiplyScalar(scale));
      pet.position.y = screenBounds.bottom + (size.y * scale / 2);

      pet.velocity = new THREE.Vector3(0, 0, 0);
      scene.add(pet);

      // Start the logic only after the model is loaded
      decideNextAction();
      animate();
    },
    undefined, // onProgress callback not needed
    function (error) {
      console.error('An error happened while loading the model:', error);
      // As a fallback, create a cube so the app doesn't crash
      const geometry = new THREE.BoxGeometry(petSize, petSize, petSize);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      pet = new THREE.Mesh(geometry, material);
      pet.position.set(0, screenBounds.bottom, 0);
      pet.velocity = new THREE.Vector3(0, 0, 0);
      scene.add(pet);
      decideNextAction();
      animate();
    }
  );
}

// --- Pet's brain ---
function decideNextAction() {
  if (!pet || !pet.actionClips) return;

  const nextState = Math.random() < 0.3 ? petState.IDLE : petState.FLYING;
  const duration = Math.random() * 4000 + 3000; // 3-7 seconds

  switch (nextState) {
    case petState.IDLE:
      currentState = petState.IDLE;
      pet.velocity.set(0, 0, 0);
      // Stop running, play idle
      if (pet.actionClips.running) pet.actionClips.running.stop();
      if (pet.actionClips.idle) pet.actionClips.idle.play();
      break;
    case petState.FLYING:
      currentState = petState.FLYING;
      const angle = Math.random() * 2 * Math.PI;
      pet.velocity.x = Math.cos(angle) * moveSpeed;
      pet.velocity.y = Math.sin(angle) * moveSpeed;
      // Stop idle, play running
      if (pet.actionClips.idle) pet.actionClips.idle.stop();
      if (pet.actionClips.running) pet.actionClips.running.play();
      break;
  }

  setTimeout(decideNextAction, duration);
}

// --- Animation loop ---
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

  if (pet) {
    // --- Update Position ---
    pet.position.x += pet.velocity.x;
    pet.position.y += pet.velocity.y;

    // --- Wall Collision ---
    if (pet.position.x <= screenBounds.left || pet.position.x >= screenBounds.right) {
      pet.velocity.x = -pet.velocity.x;
    }
    if (pet.position.y <= screenBounds.bottom || pet.position.y >= screenBounds.top) {
      pet.velocity.y = -pet.velocity.y;
    }
  }

  // --- Render ---
  renderer.render(scene, camera);
}

// --- Start the application safely ---
window.addEventListener('DOMContentLoaded', init);

// --- Handle window resizing ---
window.addEventListener('resize', () => {
  // Update camera
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Update screen bounds
  screenBounds = {
    left: (-window.innerWidth / 2) + petSize,
    right: (window.innerWidth / 2) - petSize,
    top: (window.innerHeight / 2) - petSize,
    bottom: (-window.innerHeight / 2) + petSize,
  };
});