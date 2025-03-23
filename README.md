# SuperMockio

<center>
<h3>Hello! It's-a me, your API mock maker!</h3>
<img src="./logo.1.png" width=250>
</center>

## What is SuperMockio?

**SuperMockio** is a powerful tool designed to accelerate API development by generating mock backends directly from OpenAPI specifications. Whether you're an API designer, frontend or backend developer, or project manager, SuperMockio helps you create realistic mock APIs for various use cases—such as client demos, decoupling frontend and backend development, or testing API integrations.

**Key Features:**

- **Rapid Mock Creation:** Effortlessly generate mock backends from your OpenAPI contract.
- **Intelligent Data Generation:** Leverage defined examples or utilize AI-powered generation for accurate and realistic mock data.
- **Chain-of-Responsibility Engine:** Our new engine applies a series of rules (single example, multiple examples, then AI generation) to decide which response example to use, ensuring consistency and flexibility when dealing with multiple response cases.
- **Custom Headers for Precise Responses:**  
  - **X-SuperMockio-Status:** Specify the desired HTTP status code (e.g., 200, 404, 400, 500) for endpoints that support multiple responses.
  - **X-SuperMockio-Example:** Request a specific example response by its name.
- **Strict Mode vs. Fallback Behavior:**  
  - A new environment variable, **MOCKER_STRICT_MODE**, lets you control how SuperMockio handles header mismatches.  
    - In **strict mode** (when `MOCKER_STRICT_MODE` is set to `"true"`), if the provided status code or example name doesn’t match any defined response, the API returns a 404 error with details about the header values used.
    - Otherwise, the system falls back to returning a random response associated with the endpoint.
- **Mandatory AI Generation:** AI generation is now required. You must connect SuperMockio to an AI service (such as Gemini) because if no examples are defined in your OpenAPI specification, the engine will always use AI to generate realistic examples.

## Environment Variables
*: required

| Environment Variable    | Description                                                                                         |
|-------------------------|-----------------------------------------------------------------------------------------------------|
| MONGO_PROTOCOL*         | Protocol for MongoDB connection (e.g., `mongodb` or `mongodb+srv` for cloud MongoDB instances)       |
| MONGO_USER*             | Username for MongoDB connection                                                                     |
| MONGO_HOST*             | Hostname or IP address of MongoDB server                                                            |
| MONGO_PASSWORD*         | Password for MongoDB connection                                                                     |
| MONGO_DATABASE*         | Name of the MongoDB database                                                                        |
| AI_GENERATION_ENABLED   | Flag to enable/disable AI generation (**must be enabled; AI generation is now required**)            |
| AI_SERVICE_NAME         | Name of the AI service to use (**required if AI_GENERATION_ENABLED=true**)                          |
| GEMINI_API_KEY          | API key for the Gemini AI service (**required if AI_SERVICE_NAME=gemini**)                           |
| ENABLE_UI               | Flag to enable/disable the UI (default: false)                                                      |
| SUPERMOCKIO_URL         | URL of the SuperMockio server (**required if ENABLE_UI is true**)                                    |
| MOCKER_STRICT_MODE      | When set to `"true"`, SuperMockio returns a 404 error if no response matches the provided headers; otherwise, it falls back to a random response |

## Installation

### Docker
```bash
docker-compose up -d
```

### Local Development
```bash
npm i
npm run start:dev
```

## Usage

### UI
> **Note:** To activate the UI, set the environment variable `ENABLE_UI` to `true`.

- **Services Overview:**  
  View all mocked services under the `services` section.
  
  <center>
  <img src="./readme_assets/screen1.png" width="800">
  </center>

- **OpenAPI Definition:**  
  Click on `Openapi Definition` to view the full OpenAPI spec of a service in a new tab.
  
  <center>
  <img src="./readme_assets/screen2.png" width="800">
  </center>

- **Mock Endpoints:**  
  Click on `Check Mock` to see all mocked endpoints for a service. For each endpoint, you'll see the full path, HTTP method, and status code.
  
  <center>
  <img src="./readme_assets/screen3.png" width="800">
  </center>

- **Testing Mocks:**  
  Use the `try` button to test a mock endpoint. While browsers handle success responses (2xx) well, error status codes (4xx/5xx) may trigger browser errors—so it's recommended to use clients like Postman or Thunder Client.
  
  <center>
  <img src="./readme_assets/screen4.png">
  </center>

### API

SuperMockio's API simulates real use cases by exposing all mocks under:
```
/api/mocks/{serviceName}/{serviceVersion}/*
```

For example, to test a `GET` on `/pets` for your `Swagger Petstore` service version `1.0.0`:
```bash
curl -X GET \
  'localhost:3000/api/mocks/Swagger Petstore/1.0.0/pets'
```

If your operation supports multiple responses, you can select a specific response using custom headers:
- **X-SuperMockio-Status:** Specify the desired status code.
- **X-SuperMockio-Example:** Specify the name of the example response.

Example:
```bash
curl -X GET \
  'http://localhost:3000/api/mocks/USPTO Data Set API/1.0.0/oa_citations/v1/fields' \
  --header 'X-SuperMockio-Status: 404' \
  --header 'X-SuperMockio-Example: errorExample'
```

> **Strict Mode vs. Fallback:**  
> With `MOCKER_STRICT_MODE` set to `"true"`, invalid header values (i.e., a non-existent status code or example name) will result in a 404 error with a detailed message. If this variable is not set to `"true"`, the API will instead return a random response for that endpoint.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License