import {
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils
  } from "@mediapipe/tasks-vision";
  
  let poseLandmarker: PoseLandmarker = undefined;
  let runningMode = "IMAGE";
  let enableWebcamButton: HTMLButtonElement;
  let webcamRunning: Boolean = false;
  const videoHeight = "360px";
  const videoWidth = "480px";
  
  // Before we can use PoseLandmarker class we must wait for it to finish
  // loading. Machine Learning models can be large and take a moment to
  // get everything needed to run.
  const createPoseLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        delegate: "GPU"
      },
      runningMode: runningMode,
      numPoses: 2
    });
    
    // Now that we loaded the pose landmarker we can enable the webcam.
    const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;
  
    if (hasGetUserMedia()) {
      enableCam();
    } else {
      console.warn("getUserMedia() is not supported by your browser");
    }
  };
  createPoseLandmarker();
  
  /********************************************************************
  // Demo 2: Continuously grab image from webcam stream and detect it.
  ********************************************************************/
  
  const video = document.getElementById("webcam") as HTMLVideoElement;
  const canvasElement = document.getElementById(
    "output_canvas"
  ) as HTMLCanvasElement;
  const canvasCtx = canvasElement.getContext("2d")!;
  const drawingUtils = new DrawingUtils(canvasCtx);
  /*
  // Check if webcam access is supported.
  const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;
  
  // If webcam supported, add event listener to button for when user
  // wants to activate it.
  if (hasGetUserMedia()) {
    enableCam();
    //enableWebcamButton = document.getElementById("webcamButton");
    //enableWebcamButton.addEventListener("click", enableCam);
  } else {
    console.warn("getUserMedia() is not supported by your browser");
  }*/
  // Enable the live webcam view and start detection.
  function enableCam() {
    if (!poseLandmarker) {
      console.log("Wait! poseLandmaker not loaded yet.");
      return;
    }
  
    if (webcamRunning === true) {
      webcamRunning = false;
      //enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    } else {
      webcamRunning = true;
      //enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }
  
    // getUsermedia parameters.
    const constraints = {
      video: true
    };
  
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
    });
  }
  let lastVideoTime = -1;
  async function predictWebcam() {
    canvasElement.style.height = videoHeight;
    video.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    video.style.width = videoWidth;
    // Now let's start detecting the stream.
    if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await poseLandmarker.setOptions({ runningMode: "VIDEO" });
    }
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        for (const landmark of result.landmarks) {
          console.log("Landmark");
          window.landmark = landmark;
          // draw landmarks
          /*drawingUtils.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
          });
          drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);*/
        }
        canvasCtx.restore();
      });
    }
  
    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning) {
      requestAnimationFrame(predictWebcam);
    }
  }
  
  // THREE JS BEGINS HERE
  
  // !! Bug i dont think anything is actually running
  // test the cubes see if it works.. https://codepen.io/accdecer/pen/KKYPByg
  // the render function clearly is executing each frame but I dont think anything is currently running
  import * as THREE from "three";
  
  
  let scene = new THREE.Scene();
  let aspect = 3 / 2;
  let camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  let renderer = new THREE.WebGLRenderer();
  renderer.setSize(960, 540);
  document.body.appendChild(renderer.domElement);
  
  camera.position.z = 50;

  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  
  function cameraOufOfRange() {
      return (camera.position.z >= 100 || camera.position.z <= 50);
  };
  /*let's create a cube and give it a material*/
  
  let geometry = new THREE.BoxGeometry(30, 30, 30);
  let material = new THREE.MeshLambertMaterial({
      color: "#12c712"
  });
  
  let cube = new THREE.Mesh(geometry, material);
  
  // wireframe
  let geo = new THREE.EdgesGeometry( cube.geometry );
  let mat = new THREE.LineBasicMaterial( { color: 0x074a07, linewidth: 2 } );
  let wireframe = new THREE.LineSegments( geo, mat );
  //cube.add( wireframe );
  
  //scene.add(cube);
  
  function addDot(x, y, z) {
    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x,y,z]), 3));
    const dotMaterial = new THREE.PointsMaterial({ size: 10, color: 0xff0000 });
    const dot = new THREE.Points(dotGeometry, dotMaterial);
    scene.add(dot);
    return dot;
  }
  function updateDot(x, y, z, dot) {
    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x,y,z]), 3));
    dot.geometry = dotGeometry;
  }
  let dots = []
  
  /* to see our cube, we'll need a light source */
  
  const color = 0xFFFFFF;
  const intensity = 1;
  const light = new THREE.AmbientLight(color, intensity);
  scene.add(light);
  
  let deltaZ = 0.5;
  
  /* finally, let's render our scene - read up on requestAnimationFrame()! */
  
  let render = function() {
      requestAnimationFrame(render);
      //cube.rotation.x += 0.01;
      //cube.rotation.z += 0.005;
      //camera.translateZ(deltaZ);
      camera.position.set(0, 0, -200);
      camera.lookAt(0, 0, 0);
  
      if(cameraOufOfRange()){
          deltaZ = -deltaZ;
      }
      if (window.landmark != null) {
        console.log("window landmark not null");
        console.log(window.landmark);
        for (let i = 0; i < window.landmark.length; i++) {
          let item = window.landmark[i];
          // 300 and 200
          //addDot(item.x * 75.0, item.y * 75, 0);
          
          if (dots.length <= i) {
            let dot = addDot((item.x - 0.5) * 300.0, (item.y - 0.5) * 200.0, 0);
            dots.push(dot);
          }
          else {
            updateDot((item.x - 0.5) * 300.0, (item.y - 0.5) * -200.0, item.z, dots[i]);
          }

        }
      }
      renderer.render(scene, camera);
    
      
  };
  
  
  
  render();