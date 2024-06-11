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
          drawChakras(landmark);
          window.landmark = landmark;
          // draw landmarks
          drawingUtils.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
          });
          drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
        }
        canvasCtx.restore();
      });
    }
  
    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning) {
      requestAnimationFrame(predictWebcam);
    }
  }

  function lerp(p1, p2, t) {
    let p_result = {
      x: ((p2.x - p1.x) * t) + p1.x,
      y: ((p2.y - p1.y) * t) + p1.y,
      z: ((p2.z - p1.z) * t) + p1.z
    }
    return p_result;
  }
  function drawChakras(landmark) {
    let bottom_spine_pt = lerp(landmark[23], landmark[24], 0.5);
    let top_spine_pt = lerp(landmark[12], landmark[11], 0.5);
    let third_eye_chakra_pt = lerp(landmark[1], landmark[4], 0.5);
    let webcam = document.getElementById("webcam");
    let chakras : HTMLElement[] = []
    let chakra_points : any[] = []
    for (let i = 0; i < 6; i++) {
      let chakra = document.getElementById("chakra" + String(i));
      if (chakra != null) chakras.push(chakra);
    }
    for (let i = 0; i <= 4; i++) {
      let p1 = lerp(bottom_spine_pt, top_spine_pt, -0.1);
      let p2 = lerp(bottom_spine_pt, top_spine_pt, 1.1);
      let chakra_point = lerp(p1, p2, i / 4.0);
      chakra_points.push(chakra_point);
    }
    chakra_points.push(third_eye_chakra_pt);

    for (let i = 0; i < 6; i++) {
      if (chakras[i] != null && webcam != null) {
        chakras[i].style.position = 'absolute';
        let cam_width = parseInt(webcam.style.width);
        let cam_height = parseInt(webcam.style.height)
        let left_pos = ((chakra_points[i].x * cam_width) - 10);
        let top_pos = ((chakra_points[i].y * cam_height) - 10);
        if (left_pos > cam_width || left_pos < 0 || top_pos < 0 || top_pos > cam_height) {
          chakras[i].style.visibility = 'hidden';
        } else {
          chakras[i].style.visibility = 'visible';
          chakras[i].style.left = left_pos + 'px';
          chakras[i].style.top = top_pos + 'px';
        }
      }
    }

    // try one and see how it goes!!
    //let throat_chakra_pt = lerp(bottom_spine_pt, top_spine_pt, 1.1);
    //let heart_chakra_pt = lerp(bot)
  }