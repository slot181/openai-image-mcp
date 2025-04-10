#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

import * as fs from 'fs/promises';
import * as path from 'path';

interface GenerateImageArgs {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  n?: number;
  // response_format is now always 'url'
  // image_path is removed
}

// Define the type for the base configuration
interface BaseDefaultConfig {
  width: number;
  height: number;
  steps: number;
  n: number;
  // response_format is removed as it's always 'url'
}

// Default config will be set in the constructor based on env var

class ImageGenerationServer {
  public readonly server: Server;
  private readonly apiKey: string;
  private readonly openaiApiUrl: string;
  private readonly defaultConfig: BaseDefaultConfig & { model: string };
  private readonly listToolsHandler: (request: any) => Promise<any>;
  private readonly callToolHandler: (request: any) => Promise<any>;

  constructor(apiKey: string, openaiApiUrl?: string, defaultModel?: string) {
    this.apiKey = apiKey;
    this.openaiApiUrl = openaiApiUrl || 'https://api.openai.com/v1/images/generations'; // Default to OpenAI endpoint

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    // Define base default values excluding the model
    const baseDefaultConfig: BaseDefaultConfig = {
      width: 1024,
      height: 768,
      steps: 1,
      n: 1
      // response_format is removed
    };

    // Set the final default config including the model
    this.defaultConfig = {
      ...baseDefaultConfig,
      model: defaultModel || "black-forest-labs/FLUX.1-schnell-Free", // Use provided default or fallback
    };

    this.server = new Server(
      {
        name: 'openai-image-generator',
        version: '0.1.4',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Store handlers for direct access
    this.listToolsHandler = this.createListToolsHandler();
    this.callToolHandler = this.createCallToolHandler();

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  private createListToolsHandler() {
    return async () => ({
      tools: [
        {
          name: 'generate_image',
          description: 'Generates an image using an OpenAI compatible API and returns a direct URL to the result. It is recommended to format the output URL using Markdown for better display.',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'Text prompt for image generation',
              },
              model: {
                type: 'string',
                description: `Model to use for generation (default: ${this.defaultConfig.model})`,
              },
              width: {
                type: 'number',
                description: 'Image width (default: 1024)',
                minimum: 128,
                maximum: 2048,
              },
              height: {
                type: 'number',
                description: 'Image height (default: 768)',
                minimum: 128,
                maximum: 2048,
              },
              steps: {
                type: 'number',
                description: 'Number of inference steps (default: 1)',
                minimum: 1,
                maximum: 100,
              },
              n: {
                type: 'number',
                description: 'Number of images to generate (default: 1)',
                minimum: 1,
                maximum: 4,
              },
              // response_format and image_path properties removed from schema
            },
            required: ['prompt'],
          },
        },
      ],
    });
  }

  private createCallToolHandler() {
    return async (request: any) => {
      if (request.params.name !== 'generate_image') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      // Type check and validate arguments
      if (!request.params.arguments || typeof request.params.arguments !== 'object') {
        throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments provided');
      }

      if (!('prompt' in request.params.arguments) || typeof request.params.arguments.prompt !== 'string') {
        throw new McpError(ErrorCode.InvalidParams, 'Prompt is required and must be a string');
      }

    const requestBody = {
      ...this.defaultConfig, // Use the instance's default config
  prompt: request.params.arguments.prompt,
  ...(request.params.arguments.model && { model: request.params.arguments.model }),
  ...(request.params.arguments.width && { width: request.params.arguments.width }),
  ...(request.params.arguments.height && { height: request.params.arguments.height }),
  ...(request.params.arguments.steps && { steps: request.params.arguments.steps }),
  ...(request.params.arguments.n && { n: request.params.arguments.n }),
  response_format: "url" // Force URL format
};

try {

        const response = await axios.post(
          this.openaiApiUrl,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        // Image saving logic is removed

        // Extract the URL from the response
        const imageUrl = response.data?.data?.[0]?.url;

        if (!imageUrl) {
           throw new McpError(ErrorCode.InternalError, 'API response did not contain an image URL.');
        }

        // Return the image URL directly
        return {
          content: [
            {
              type: 'text',
              text: imageUrl, // Return only the URL
            },
          ],
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: 'text',
                text: `API Error: ${error.response?.data?.message || error.message}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    };
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, this.listToolsHandler);
    this.server.setRequestHandler(CallToolRequestSchema, this.callToolHandler);
  }

  async handleRequest(request: Request): Promise<Response> {
    try {
      const body = await request.json();

      // Handle request based on method
      let result;
      if (body.method === 'list_tools') {
        result = await this.listToolsHandler(body);
      } else if (body.method === 'call_tool') {
        result = await this.callToolHandler(body);
      } else {
        throw new Error(`Unknown method: ${body.method}`);
      }

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      const error = err as Error;
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// --- Argument Parsing ---
// Helper function to parse arguments in the format "-e KEY VALUE"
function parseCliArgs(argv: string[]): { [key: string]: string } {
  const args = argv.slice(2); // Skip node executable and script path
  const parsed: { [key: string]: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-e' && i + 2 < args.length) {
      const key = args[i + 1];
      const value = args[i + 2];
      parsed[key] = value;
      i += 2; // Move index past the key and value
    }
  }
  return parsed;
}

const cliArgs = parseCliArgs(process.argv);

// --- Configuration Loading ---
// Prioritize command-line args, fall back to environment variables
const API_KEY = cliArgs.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const OPENAI_API_URL = cliArgs.OPENAI_API_URL || process.env.OPENAI_API_URL; // Optional API endpoint URL
const DEFAULT_MODEL = cliArgs.DEFAULT_MODEL || process.env.DEFAULT_MODEL; // Optional default model

if (!API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

// Create and run server
const server = new ImageGenerationServer(API_KEY, OPENAI_API_URL, DEFAULT_MODEL);
const transport = new StdioServerTransport();
server.server.connect(transport).catch(console.error);
console.error('OpenAI Image Generation MCP server running on stdio');
