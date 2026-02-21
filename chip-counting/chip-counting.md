
## new chip counter detection feature

 we are going to use roboflow models to count chips and display the results back to the user, the user need to take a photo,mask the region where all the chips live , crop that region and paste it over a white background 
 an example is placed in /Users/edgarsantiago/Projects/2025/current/poker/app/chip-counting/before.png and /Users/edgarsantiago/Projects/2025/current/poker/app/chip-counting/after.png

then we need to send the file to roboflows api, this is an example provided by the company, the api key is real so guard it accordingly:

```
const axios = require("axios");
const fs = require("fs");

const image = fs.readFileSync("YOUR_IMAGE.jpg", {
    encoding: "base64"
});

axios({
    method: "POST",
    url: "https://serverless.roboflow.com/poker-chip-count/2",
    params: {
        api_key: "2KEAu4XQgsFHv8s0fq4J"
    },
    data: image,
    headers: {
        "Content-Type": "application/x-www-form-urlencoded"
    }
})
.then(function(response) {
    console.log(response.data);
})
.catch(function(error) {
    console.log(error.message);
});
```
this returns the following json as result, we'll need to draw boxes around the image 

```{
  "predictions": [
    {
      "x": 2698.5,
      "y": 2248.5,
      "width": 627,
      "height": 619,
      "confidence": 0.919,
      "class": "Black PokerChip",
      "class_id": 0,
      "detection_id": "5cd5c609-b642-4006-878a-b69e631dba02"
    },
    {
      "x": 2531,
      "y": 3837.5,
      "width": 450,
      "height": 389,
      "confidence": 0.856,
      "class": "Red PokerChip",
      "class_id": 3,
      "detection_id": "287d32e1-605b-4853-93d9-ab13f6afae3d"
    },
    {
      "x": 1569,
      "y": 2234.5,
      "width": 648,
      "height": 633,
      "confidence": 0.856,
      "class": "Black PokerChip",
      "class_id": 0,
      "detection_id": "716bde70-4c63-4cfe-9da4-ec49f6dda5b6"
    },
    {
      "x": 1350.5,
      "y": 3243,
      "width": 583,
      "height": 556,
      "confidence": 0.826,
      "class": "Black PokerChip",
      "class_id": 0,
      "detection_id": "9f4a6890-af12-4aeb-86fd-729a0441ce01"
    },
    {
      "x": 471,
      "y": 1792.5,
      "width": 744,
      "height": 713,
      "confidence": 0.793,
      "class": "Black PokerChip",
      "class_id": 0,
      "detection_id": "b5662237-804f-4674-a7b4-300655a7ecc7"
    },
    {
      "x": 2857.5,
      "y": 3904,
      "width": 329,
      "height": 248,
      "confidence": 0.709,
      "class": "White PokerChip",
      "class_id": 4,
      "detection_id": "86ce4922-a120-4874-a9c3-242377bc5ec7"
    },
    {
      "x": 1672,
      "y": 3814.5,
      "width": 506,
      "height": 435,
      "confidence": 0.673,
      "class": "Black PokerChip",
      "class_id": 0,
      "detection_id": "8717ccc8-b084-4e91-9ed6-15cec90f31f3"
    },
    {
      "x": 1922,
      "y": 3968,
      "width": 342,
      "height": 126,
      "confidence": 0.611,
      "class": "Blue PokerChip",
      "class_id": 1,
      "detection_id": "c0e7f18e-4c31-4558-bb21-7658c738e603"
    }
  ]
}
```

claude in the browser suggested using a combination of: Polygon selection UI (Skia overlay + draggable points) and “masked + cropped” image (Skia offscreen)

so this is the general flow :

- user selects image or captures it from the camera
- the image is shown to the user so that they can draw the polygon over it 
- the user confirms the selected mask
- image is output to a full white bg and only the masked portion showing this
- user presses confirm and the image is compressed, we dont need a large image, prioritize resolution over large size
- send to roboflow, get results, draw bounding boxes
