# Google AI Studio to API Adapter

[中文文档](README_CN.md) | English

A tool that wraps Google AI Studio web interface to provide OpenAI API and Gemini API compatible endpoints. The service acts as a proxy, converting API requests to browser interactions with the AI Studio web interface.

> **👏 Acknowledgements**: This project is forked from [ais2api](https://github.com/Ellinav/ais2api) by [Ellinav](https://github.com/Ellinav). We express our sincere gratitude to the original author for creating this excellent foundation.

## ✨ Features

- 🔄 **API Compatibility**: Compatible with both OpenAI API and Gemini API formats
- 🌐 **Web Automation**: Uses browser automation to interact with AI Studio web interface
- 🔐 **Authentication**: Secure API key-based authentication
- 🐳 **Docker Support**: Easy deployment with Docker and Docker Compose
- 📝 **Model Support**: Access to various Gemini models through AI Studio, including image generation models

## 🚀 Quick Start

### 💻 Local Development (Windows Only)

1. Clone the repository:

```powershell
git clone https://github.com/iBenzene/AIStudioToAPI.git
cd AIStudioToAPI
```

2. Run the setup script:

```powershell
npm run setup-auth
```

This script will:

- Automatically download the Camoufox browser (a privacy-focused Firefox fork)
- Launch the browser and navigate to AI Studio automatically
- Save your authentication credentials locally

3. Start the service:

```powershell
npm install
npm start
```

The API server will be available at `http://localhost:7860`

### ☁ Cloud Deployment (Linux VPS)

For production deployment on a server (Linux VPS), you need to extract authentication credentials from a Windows machine first.

#### 📝 Step 1: Extract Authentication Credentials (on Windows)

1. Clone the repository on a Windows machine:

```powershell
git clone https://github.com/iBenzene/AIStudioToAPI.git
cd AIStudioToAPI
```

2. Run the setup script:

```powershell
npm run setup-auth
```

This will:

- Download Camoufox browser automatically
- Launch the browser and navigate to AI Studio automatically
- Log in with your Google account
- Save authentication credentials to `configs/auth/auth-N.json` (where N is an auto-incremented index starting from 0)

**How it works**: The script uses browser automation to capture your AI Studio session cookies and tokens, storing them securely in a JSON file. The authentication file is named with an auto-incremented index (auth-0.json, auth-1.json, etc.) to support multiple accounts. This allows the API to make authenticated requests to AI Studio without requiring interactive login on the server.

3. Locate the authentication file:

```powershell
ls configs/auth/auth-*.json
```

4. Copy the auth file to your server:

```powershell
scp configs/auth/auth-*.json user@your-server:/path/to/deployment/configs/auth/
```

5. You can now delete the cloned repository from your Windows machine.

#### 🚢 Step 2: Deploy on Server

##### 🐋 Option 1: Docker Command

```bash
docker run -d \
  --name aistudio-to-api \
  -p 7860:7860 \
  -v /path/to/auth:/app/configs/auth \
  -e API_KEYS=your-api-key-1,your-api-key-2 \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  ghcr.io/ibenzene/aistudio-to-api:latest
```

Parameters:

- `-p 7860:7860`: API server port (if using a reverse proxy, strongly consider `127.0.0.1:7860`)
- `-v /path/to/auth:/app/configs/auth`: Mount directory containing auth files
- `-e API_KEYS`: Comma-separated list of API keys for authentication
- `-e TZ=Asia/Shanghai`: Timezone for logs (optional, defaults to system timezone)

##### 📦 Option 2: Docker Compose

Create a `docker-compose.yml` file:

```yaml
name: aistudio-to-api

services:
  app:
    image: ghcr.io/ibenzene/aistudio-to-api:latest
    container_name: aistudio-to-api
    ports:
      - 7860:7860
    restart: unless-stopped
    volumes:
      - ./auth:/app/configs/auth
    environment:
      API_KEYS: your-api-key-1,your-api-key-2
      TZ: Asia/Shanghai # Timezone for logs (optional)
```

Start the service:

```bash
sudo docker compose up -d
```

View logs:

```bash
sudo docker compose logs -f
```

Stop the service:

```bash
sudo docker compose down
```

##### 🌐 Step 3 (Optional): Nginx Reverse Proxy

If you need to access via a domain name or want unified management at the reverse proxy layer (e.g., configure HTTPS, load balancing, etc.), you can use Nginx.

> 📖 For detailed Nginx configuration instructions, see: [Nginx Reverse Proxy Configuration](docs/en/nginx-setup.md)

## 📡 API Usage

### 🤖 OpenAI-Compatible API

This endpoint is processed and then forwarded to the official Gemini API format endpoint.

- `GET /openai/v1/models`: List models.
- `POST /openai/v1/chat/completions`: Chat completion and image generation, supports non-streaming, real streaming, and fake streaming.

### ♊ Gemini Native API Format

This endpoint is forwarded to the official Gemini API format endpoint.

- `GET /models`: List available Gemini models.
- `POST /models/{model_name}:generateContent`: Generate content and images.
- `POST /models/{model_name}:streamGenerateContent`: Stream content and image generation, supports real and fake streaming.

> 📖 For detailed API usage examples, see: [API Usage Examples](docs/en/api-examples.md)

## 🧰 Configuration

### 🔧 Environment Variables

#### 📱 Application Configuration

| Variable                    | Description                                                                    | Default              |
| :-------------------------- | :----------------------------------------------------------------------------- | :------------------- |
| `API_KEYS`                  | Comma-separated list of valid API keys for authentication.                     | `123456`             |
| `PORT`                      | API server port.                                                               | `7860`               |
| `HOST`                      | Server listening host address.                                                 | `0.0.0.0`            |
| `ICON_URL`                  | Custom favicon URL for the console. Supports ICO, PNG, SVG, etc.               | `/AIStudio_logo.svg` |
| `SECURE_COOKIES`            | Enable secure cookies. `true` for HTTPS only, `false` for both HTTP and HTTPS. | `false`              |
| `RATE_LIMIT_MAX_ATTEMPTS`   | Maximum failed login attempts allowed within the time window (0 to disable).   | `5`                  |
| `RATE_LIMIT_WINDOW_MINUTES` | Time window for rate limiting in minutes.                                      | `15`                 |

#### 🌐 Proxy Configuration

| Variable                        | Description                                                                                          | Default   |
| :------------------------------ | :--------------------------------------------------------------------------------------------------- | :-------- |
| `INITIAL_AUTH_INDEX`            | Initial authentication index to use on startup.                                                      | `1`       |
| `MAX_RETRIES`                   | Maximum number of retries for failed requests (only effective for fake streaming and non-streaming). | `3`       |
| `RETRY_DELAY`                   | Delay between retries in milliseconds.                                                               | `2000`    |
| `SWITCH_ON_USES`                | Number of requests before automatically switching accounts (0 to disable).                           | `40`      |
| `FAILURE_THRESHOLD`             | Number of consecutive failures before switching accounts (0 to disable).                             | `3`       |
| `IMMEDIATE_SWITCH_STATUS_CODES` | HTTP status codes that trigger immediate account switching (comma-separated).                        | `429,503` |

#### 🗒️ Other Configuration

| Variable            | Description                                                           | Default |
| :------------------ | :-------------------------------------------------------------------- | :------ |
| `STREAMING_MODE`    | Streaming mode. `real` for real streaming, `fake` for fake streaming. | `real`  |
| `FORCE_THINKING`    | Force enable thinking mode for all requests.                          | `false` |
| `FORCE_WEB_SEARCH`  | Force enable web search for all requests.                             | `false` |
| `FORCE_URL_CONTEXT` | Force enable URL context for all requests.                            | `false` |

### 🧠 Model List Configuration

Edit `configs/models.json` to customize available models and their settings.

## 📄 License

This project is a fork of [**ais2api**](https://github.com/Ellinav/ais2api) by [**Ellinav**](https://github.com/Ellinav), and fully adopts the CC BY-NC 4.0 license used by the upstream project. All usage, distribution, and modification activities must comply with all terms of the original license. See the full license text in [LICENSE](LICENSE).

### ©️ Copyright / Attribution

- Original work Copyright © [Ellinav](https://github.com/Ellinav)
- Modifications and additions Copyright © 2024 [iBenzene](https://github.com/iBenzene) and contributors
