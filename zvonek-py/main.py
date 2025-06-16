import cv2
import qrcode
from fastapi import FastAPI, Response, Request, WebSocket
from fastapi.responses import StreamingResponse, FileResponse
from pyhap.accessory import Accessory
from pyhap.accessory_driver import AccessoryDriver
from pyhap.const import CATEGORY_DOOR_LOCK
from threading import Thread
import logging
import os
from picamera2 import Picamera2
from fastapi.middleware.cors import CORSMiddleware
import jwt
import asyncio

app = FastAPI()

homekit_connected = False

# Global variables
global pincode
pincode = None  # Initialize the global variable to store the HomeKit pincode
camera = None
frame = None
qr_code_path = "homekit_qr.png"  # Path to save the QR code image
driver = None
door_accessory = None

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for development purposes)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
)

# Enable logging
logging.basicConfig(level=logging.INFO)

# Initialize PiCamera2
try:
    camera = Picamera2()
    camera.configure(camera.create_video_configuration())
    camera.start()
    logging.info("PiCamera initialized and started.")
except Exception as e:
    logging.error(f"Failed to initialize PiCamera: {e}")

# Function to capture frames from PiCamera
def generate_frames():
    if camera:
        while True:
            try:
                frame = camera.capture_array()
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                _, buffer = cv2.imencode('.jpg', frame)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            except Exception as e:
                logging.error(f"Error capturing frame: {e}")
                break

# Function to generate HomeKit QR code
def generate_homekit_qr_code(setup_id, pincode):
    payload = f"X-HM://{setup_id}{pincode.replace('-', '')}"
    qr = qrcode.make(payload)
    qr.save(qr_code_path)
    logging.info(f"QR Code saved to {qr_code_path}")

def verify_token(request: Request):
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return None
    token = token.split(" ")[1]
    try:
        payload = jwt.decode(token, "dev-secret", algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None

# HomeKit Accessory: Door Lock
class DoorAccessory(Accessory):
    category = CATEGORY_DOOR_LOCK

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.locked = True

        # Add a Lock Mechanism Service
        serv_lock = self.add_preload_service("LockMechanism")
        self.char_lock_current = serv_lock.configure_char(
            "LockCurrentState", getter_callback=self.get_lock_state
        )
        self.char_lock_target = serv_lock.configure_char(
            "LockTargetState", getter_callback=self.get_lock_state, setter_callback=self.set_lock_state
        )

    def get_lock_state(self):
        """Getter for the current lock state."""
        return 1 if self.locked else 0  # 1 = locked, 0 = unlocked

    def set_lock_state(self, value):
        global homekit_connected
        homekit_connected = True
        if value == 1:
            self.locked = True
            logging.info("Door locked!")
        else:
            self.locked = False
            logging.info("Door unlocked!")

# Start the HomeKit server
def start_homekit():
    global pincode
    global driver
    global door_accessory
    driver = AccessoryDriver(port=51826)

    # Add the Door Lock Accessory
    door = DoorAccessory(driver, "Chytry Zvonek")
    driver.add_accessory(accessory=door)
    door_accessory = door

    # Generate the HomeKit QR Code
    setup_id = driver.state.setup_id
    pincode = driver.state.pincode.decode("utf-8")  # Save the pincode
    generate_homekit_qr_code(setup_id, pincode)

    # Print the pairing code
    logging.info(f"HomeKit Pairing Code: {pincode}")

    # Start the driver
    driver.start()


# Start the HomeKit server in a separate thread (moved to global scope)
Thread(target=start_homekit, daemon=True).start()

connections = []

# Flag for doorbell event (if not broadcasting immediately)
# connections list will be used to broadcast doorbell events directly

@app.websocket("/ws/status")
async def status_websocket(websocket: WebSocket):
    await websocket.accept()
    connections.append(websocket)
    try:
        while True:
            if door_accessory is not None:
                locked = door_accessory.locked
                door_open = not door_accessory.locked
            else:
                locked = None
                door_open = None

            status = {
                "homekit_connected": homekit_connected,
                "locked": locked,
                "door_open": door_open
            }
            await websocket.send_json(status)
            logging.debug(f"WebSocket status sent: {status}")
            await asyncio.sleep(2)
    except Exception as e:
        logging.warning(f"WebSocket disconnected: {e}")
    finally:
        connections.remove(websocket)

@app.post("/api/ring")
async def ring_doorbell():
    """
    Endpoint to trigger doorbell event.
    Broadcasts a doorbell notification to all connected WebSocket clients.
    """
    logging.info("Doorbell rang via API!")
    # Notify all active WebSocket connections
    for ws in connections.copy():
        try:
            await ws.send_json({"event": "doorbell"})
        except Exception as e:
            logging.warning(f"Failed to send doorbell event: {e}")
    return {"status": "success", "message": "Doorbell event sent"}

# FastAPI: Camera stream API
@app.get("/api/camera-stream")
def camera_stream():
    if camera:
        return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")
    else:
        return Response(content="Camera not initialized", status_code=500)

# FastAPI: QR Code API
@app.get("/api/homekit-qr")
def get_homekit_qr():
    if os.path.exists(qr_code_path):
        return FileResponse(qr_code_path, media_type="image/png", filename="homekit_qr.png")
    else:
        return {"error": "QR Code not generated yet"}

@app.get("/api/open-door")
def open_door(request: Request):
    if not verify_token(request):
        return Response(content="Unauthorized", status_code=401)
    if door_accessory:
        door_accessory.set_lock_state(0)
    logging.info("Door opened via API!")
    return {"status": "success", "message": "Door opened"}

@app.get("/api/lock-door")
def lock_door(request: Request):
    if not verify_token(request):
        return Response(content="Unauthorized", status_code=401)
    if door_accessory:
        door_accessory.set_lock_state(1)
    logging.info("Door locked via API!")
    return {"status": "success", "message": "Door locked"}

@app.get("/api/homekit-code")
def get_homekit_code():
    """Get the saved HomeKit pincode."""
    global pincode
    if pincode:
        logging.info("HomeKit Code accessed")
        return {"pincode": pincode}
    else:
        logging.warning("HomeKit Code not generated yet")
        return {"error": "HomeKit Code not generated yet"}

@app.get("/api/homekit-status")
def get_homekit_status():
    # Determine file path for accessory.state alongside this script
    state_file = os.path.join(os.path.dirname(__file__), "accessory.state")
    # homekit is considered connected if the file exists
    status = os.path.exists(state_file)
    return {"homekit_connected": status}

# Run the FastAPI server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)