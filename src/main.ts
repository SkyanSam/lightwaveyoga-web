// Importing modules.
import {
  PoseLandmarker,
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
  NormalizedLandmark
} from "@mediapipe/tasks-vision";

// Declaring variables.
let poseLandmarker: PoseLandmarker;
let faceLandmarker: FaceLandmarker;
let runningMode = "VIDEO";
let webcamRunning: Boolean = false;
const videoHeight = "360px";
const videoWidth = "480px";

// Function that returns true if a variable is null.
function isNull(variable) {
  return variable == null || variable == undefined;
}

// Function that loads PoseLandmarker and FaceLandmarker class.
// Note that this function takes a while, since we are loading the machine learning model.
const createLandmarkers = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm" // use 0.10.0 or 0.10.3
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numPoses: 1
  });
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
      delegate: "GPU"
    },
    outputFaceBlendshapes: true,
    runningMode: runningMode,
    numFaces: 1
  });

  // Now that we loaded the landmarkers we can enable the webcam.
  const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;
  if (hasGetUserMedia()) {
    enableCam();
  } else {
    console.warn("getUserMedia() is not supported by your browser");
  }
};

// Function that enables the live webcam view and start detection.
function enableCam() {
  // Check if the landmarkers have loaded.
  if (!poseLandmarker || !faceLandmarker) {
    console.log("Wait! poseLandmaker not loaded yet.");
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
  } else {
    webcamRunning = true;
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

// Call the asynchronous function.
createLandmarkers();

// Get video and canvas contexts.
const video = document.getElementById("webcam") as HTMLVideoElement;
const canvasElement = document.getElementById(
  "output_canvas"
) as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d") !;

// Function that is called whenever video stream recieves new data, (so every frame).
let lastVideoTime = -1;
async function predictWebcam() {
  canvasElement.style.height = videoHeight;
  video.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  video.style.width = videoWidth;
  // Detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await poseLandmarker.setOptions({
      runningMode: "VIDEO"
    });
  }
  let startTimeMs = performance.now();
  let poseLandmarks: NormalizedLandmark[] = [];
  let faceLandmarks: NormalizedLandmark[] = [];

  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    // Get landmarks from pose model.
    poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      for (const landmark of result.landmarks) {
        poseLandmarks = landmark;
      }
      canvasCtx.restore();
    });
    // Get landmarks from face model.
    let results = faceLandmarker.detectForVideo(video, startTimeMs);
    if (results.faceLandmarks) {
      for (const landmarks of results.faceLandmarks) {
        faceLandmarks = landmarks;
      }
    }
    // Draw the chakras.
    drawChakras(poseLandmarks, faceLandmarks);
  }

  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning) {
    requestAnimationFrame(predictWebcam);
  }
}

// Function that performs interpolation between two points.
function lerp(p1, p2, t) {
  let p_result = {
    x: ((p2.x - p1.x) * t) + p1.x,
    y: ((p2.y - p1.y) * t) + p1.y,
    z: ((p2.z - p1.z) * t) + p1.z
  }
  return p_result;
}

// Function that draws the chakras.
function drawChakras(landmark, faceLandmark) {
  // Checks to make sure the landmark list is not undefined.
  // Also checks that the landmarks that we will be using are not undefined.
  if (isNull(landmark)) return;
  let landmarks_used = [1, 4, 11, 12, 23, 24];
  for (var l in landmarks_used) {
    if (isNull(landmark[l])) return;
  }
  // Get chakra coordinates using interpolation as necessary.
  let top_head_pt = faceLandmark[10];
  let bottom_spine_pt = lerp(landmark[23], landmark[24], 0.5);
  let top_spine_pt = lerp(landmark[12], landmark[11], 0.5);
  let third_eye_chakra_pt = lerp(landmark[1], landmark[4], 0.5);
  // Creating arrays for chakra html elements and chakra coordinates.
  let chakras: HTMLElement[] = []
  let chakra_points: any[] = []
  // Getting HTML elements
  let webcam = document.getElementById("webcam");
  for (let i = 0; i < 7; i++) {
    let chakra = document.getElementById("chakra" + String(i));
    if (!isNull(chakra)) chakras.push(chakra);
  }
  // Interpolating chakra coordinates from the root chakra to the throat chakra.
  let p1 = lerp(bottom_spine_pt, top_spine_pt, -0.1);
  let p2 = lerp(bottom_spine_pt, top_spine_pt, 1.1);
  for (let i = 0; i <= 4; i++) {
    let chakra_point = lerp(p1, p2, i / 4.0);
    chakra_points.push(chakra_point);
  }
  // Adding third eye Chakra coordinates.
  chakra_points.push(third_eye_chakra_pt);
  // Add crown chakra coordinates if the face landmark exists.
  if (!isNull(faceLandmark) && !isNull(top_head_pt)) {
    chakra_points.push(lerp(chakra_points[4], top_head_pt, 1.05));
  } else {
    chakra_points.push({
      x: 0,
      y: 0,
      z: 0
    });
  }
  // Update chakra HTML elements and their positions.
  for (let i = 0; i < 7; i++) {
    if (!isNull(chakras[i]) && !isNull(chakra_points[i]) && !isNull(webcam)) {
      chakras[i].style.position = 'absolute';
      let cam_width = parseInt(webcam.style.width);
      let cam_height = parseInt(webcam.style.height);
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
}