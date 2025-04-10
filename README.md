# OpenAI Image Generation MCP Server

A Model Context Protocol (MCP) server that enables seamless generation of high-quality images using OpenAI compatible APIs. This server provides a standardized interface to specify image generation parameters.

<a href="https://glama.ai/mcp/servers/y6qfizhsja">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/y6qfizhsja/badge" alt="Image Generation Server MCP server" />
</a>

## Features

- High-quality image generation powered by OpenAI compatible APIs
- Support for customizable dimensions (width and height)
- Clear error handling for prompt validation and API issues
- Easy integration with MCP-compatible clients
- Optional image saving to disk in PNG format

## Installation

```bash
npm install openai-image-mcp
```

Or run directly:

```bash
npx openai-image-mcp@latest
```

### Configuration

Add to your MCP server configuration:

<summary>Configuration Example</summary>

```json
{
  "mcpServers": {
    "openai-image-gen": {
      "command": "npx",
      "args": ["openai-image-mcp@latest -y"],
      "env": {
        "OPENAI_API_KEY": "<YOUR_API_KEY>",
        "OPENAI_API_URL": "<OPTIONAL_API_ENDPOINT_URL>" // Optional: Defaults to OpenAI standard endpoint if not provided
      }
    }
  }
}
```

## Usage

The server provides one tool: `generate_image`

### Using generate_image

This tool has only one required parameter - the prompt. All other parameters are optional and use sensible defaults if not provided.

#### Parameters

```typescript
{
  // Required
  prompt: string;          // Text description of the image to generate

  // Optional with defaults
  model?: string;          // Default: "black-forest-labs/FLUX.1-schnell-Free"
  width?: number;          // Default: 1024 (min: 128, max: 2048)
  height?: number;         // Default: 768 (min: 128, max: 2048)
  steps?: number;          // Default: 1 (min: 1, max: 100)
  n?: number;             // Default: 1 (max: 4)
  response_format?: string; // Default: "b64_json" (options: ["b64_json", "url"])
  image_path?: string;     // Optional: Path to save the generated image as PNG
}
```

#### Minimal Request Example

Only the prompt is required:

```json
{
  "name": "generate_image",
  "arguments": {
    "prompt": "A serene mountain landscape at sunset"
  }
}
```

#### Full Request Example with Image Saving

Override any defaults and specify a path to save the image:

```json
{
  "name": "generate_image",
  "arguments": {
    "prompt": "A serene mountain landscape at sunset",
    "width": 1024,
    "height": 768,
    "steps": 20,
    "n": 1,
    "response_format": "b64_json",
    "model": "black-forest-labs/FLUX.1-schnell-Free",
    "image_path": "/path/to/save/image.png"
  }
}
```

#### Response Format

The response will be a JSON object containing:

```json
{
  "id": string,        // Generation ID
  "model": string,     // Model used
  "object": "list",
  "data": [
    {
      "timings": {
        "inference": number  // Time taken for inference
      },
      "index": number,      // Image index
      "b64_json": string    // Base64 encoded image data (if response_format is "b64_json")
      // OR
      "url": string        // URL to generated image (if response_format is "url")
    }
  ]
}
```

If image_path was provided and the save was successful, the response will include confirmation of the save location.

### Default Values

If not specified in the request, these defaults are used:

- model: "black-forest-labs/FLUX.1-schnell-Free"
- width: 1024
- height: 768
- steps: 1
- n: 1
- response_format: "b64_json"

### Important Notes

1. Only the `prompt` parameter is required
2. All optional parameters use defaults if not provided
3. When provided, parameters must meet their constraints (e.g., width/height ranges)
4. Base64 responses can be large - use URL format for larger images
5. When saving images, ensure the specified directory exists and is writable

## Prerequisites

- Node.js >= 16
- OpenAI compatible API key (`OPENAI_API_KEY`)
- Optional: OpenAI API URL (`OPENAI_API_URL`) if using a non-standard endpoint (e.g., self-hosted or alternative provider). If not provided, defaults to the standard OpenAI API endpoint.

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "0.6.0",
  "axios": "^1.6.7"
}
```

## Development

Clone and build the project:

```bash
git clone https://github.com/your-username/openai-image-mcp
cd openai-image-mcp
npm install
npm run build
```

### Available Scripts

- `npm run build` - Build the TypeScript project
- `npm run watch` - Watch for changes and rebuild
- `npm run inspector` - Run MCP inspector

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`feature/my-new-feature`)
3. Commit your changes
4. Push the branch to your fork
5. Open a Pull Request

Feature requests and bug reports can be submitted via GitHub Issues. Please check existing issues before creating a new one.

For significant changes, please open an issue first to discuss your proposed changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.