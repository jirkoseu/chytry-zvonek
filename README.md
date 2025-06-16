Zvonek

Kompletní příručka pro spuštění aplikace, která se skládá z FastAPI backendu (Python) a Next.js frontendové aplikace.

Obsah
	1.	Přehled projektu
	2.	Požadavky
	3.	Instalace a spuštění backendu
	4.	Instalace a spuštění frontendu
	5.	Konfigurace
	6.	WebSocket status a HomeKit API
	7.	Užitečné příkazy

⸻

Přehled projektu

Aplikace Zvonek poskytuje:
	•	Backend (FastAPI server v main.py):
	•	WebSocket /ws/status pro status zámku, HomeKitu a dveří
	•	HTTP API endpointy:
	•	GET  /api/homekit-code – načtení HomeKit PIN kódu
	•	GET  /api/homekit-status – informace o stavu HomeKit (na základě accessory.state)
	•	POST /api/ring – simulace zazvonění
	•	GET  /api/open-door – odemknutí dveří
	•	GET  /api/lock-door – zamknutí dveří
	•	GET  /api/camera-stream – stream kamery z PiCamera2
	•	GET  /api/homekit-qr – QR kód pro párování HomeKit
	•	Frontend (Next.js / React) v adresáři frontend/:
	•	Ovládací panel s tlačítky (Odemknout, Zamknout, Zvonit)
	•	Zobrazení stavu zámku, HomeKitu a kamery
	•	Párování HomeKit, interaktivní UI a toast notifikace

⸻

Požadavky
	•	Hardware: Raspberry Pi (s kamerou a HomeKit příslušenstvím)
	•	Operační systém: Linux (Raspbian nebo podobné)
	•	Software:
	•	Python 3.10+
	•	Node.js 16+ a npm / Yarn
	•	picamera2 modul (pro Raspberry Pi)

⸻

Instalace a spuštění backendu
	1.	Klonujte repozitář:

git clone <URL_REPO>
cd zvonek-py


	2.	Vytvořte a aktivujte virtuální prostředí:

python3 -m venv venv
source venv/bin/activate


	3.	Instalujte závislosti:

pip install -r requirements.txt


	4.	Spusťte backend:

uvicorn main:app --host 0.0.0.0 --port 8000



Backend bude dostupný na http://<IP_PI>:8000.

⸻

Instalace a spuštění frontendu
	1.	Přejděte do složky frontend:

cd frontend


	2.	Instalujte balíčky:

npm install
# nebo
yarn install


	3.	Vytvořte soubor .env.local:

NEXT_PUBLIC_API_BASE_URL=http://<IP_PI>:8000
NEXT_PUBLIC_WS_URL=ws://<IP_PI>:8000/ws/status


	4.	Spusťte vývojový server:

npm run dev
# nebo
yarn dev



Frontend bude dostupný na http://localhost:3000.

⸻

Konfigurace
	•	Adresu backendu a WebSocket nastavíte v .env.local:
	•	NEXT_PUBLIC_API_BASE_URL
	•	NEXT_PUBLIC_WS_URL
	•	HomeKit server se spouští automaticky ve vlákně v main.py.
	•	Soubor accessory.state pro status HomeKit:
	•	Pokud existuje, HomeKit je považován za připojený.
	•	Pokud ne, status je false.

⸻

WebSocket status a HomeKit API
	•	WebSocket: ws://<IP_PI>:8000/ws/status
	•	Vrací JSON: { "homekit_connected": true|false, "locked": true|false, "door_open": true|false }
	•	HomeKit PIN: GET /api/homekit-code vrací { "pincode": "123-45-678" }
	•	HomeKit status: GET /api/homekit-status vrací { "homekit_connected": true|false }

⸻

Užitečné příkazy
	•	Zvonění:

curl -X POST http://<IP_PI>:8000/api/ring


	•	Odemknutí:

curl -X GET http://<IP_PI>:8000/api/open-door -H "Authorization: Bearer <token>"


	•	Zamknutí:

curl -X GET http://<IP_PI>:8000/api/lock-door -H "Authorization: Bearer <token>"


	•	Stažení QR kódu:

curl -O http://<IP_PI>:8000/api/homekit-qr