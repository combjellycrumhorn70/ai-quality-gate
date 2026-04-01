/**
 * AI Quality Gate - MCP Server
 * AI code quality automation
 *
 * Principal Level - Zero Workarounds
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import * as z from 'zod/v4'

import { shouldUseCliMode } from '@/cli/parseCli'
import { runCli } from '@/cli/run'
import { getPackageVersion } from '@/utils/packageVersion'

import { runQualityFixForFiles, toToolResponse } from '@/server/qualityFixHandlers'

const PACKAGE_VERSION = getPackageVersion()

const TOOL_DESCRIPTION = `Run quality checks on code files and auto-fix deterministic issues.

Phase 1 (Local, ~2-3s): TypeScript + ESLint + SonarJS (~60 rules) + AST fixers
Phase 2 (Server, optional): Deep SonarQube analysis (only if configured)

🎯 Phase 1 is comprehensive - most users won't need Phase 2!

Auto-fixes (ESLint + AST):
- Curly braces on single-statement if (AST)
- Single-expression arrow bodies where safe (AST)

Code Quality Limits:
- File: max 400 lines
- Function: max 50 lines, max 5 params, max 4 depth, max 20 statements
- Complexity: Cognitive max 15, Cyclomatic max 10
- Security: no-eval, no-new-func, no-implied-eval
- Best Practices: eqeqeq, no-throw-literal, prefer-promise-reject-errors`

const server = new McpServer({ name: 'ai-quality-gate', version: PACKAGE_VERSION })

server.registerTool(
  'quality_fix',
  {
    description: TOOL_DESCRIPTION,
    inputSchema: { files: z.array(z.string()).min(1).describe('Array of file paths to check (absolute or relative to workspace)') }
  },
  async ({ files }) => {
    const path = await import('node:path')
    const { resolveFilePath } = await import('@/utils/resolveFilePath')
    const { detectWorkspaceRoot } = await import('@/utils/detectWorkspaceRoot')

    let workspaceRoot = process.env['PROJECT_ROOT']

    // Attempt to get accurate root from the MCP client to fix the Cursor 'cwd' problem
    if (!workspaceRoot) {
      try {
        const result = await server.server.request({ method: 'roots/list' }, z.any()) as { roots?: { uri: string }[] }
        if (result?.roots && result.roots.length > 0) {
          // Normalize file:// URI to standard path
          const rawUri = result.roots[0]?.uri
          if (rawUri) {
            workspaceRoot = rawUri.replace(/^file:\/\//, '')
          }
        }
      } catch (e) {
        // Client might not support roots/list, ignore
      }
    }

    // Default fallback to the exact logic requested by the user
    if (!workspaceRoot) {
      workspaceRoot = detectWorkspaceRoot(process.cwd())
    }
    
    // Resolve all files to absolute paths
    const resolvedFiles: string[] = []
    
    try {
      for (const file of files) {
        resolvedFiles.push(resolveFilePath(file, workspaceRoot))
      }
    } catch (e) {
      // If auto-resolution fails, return the clear error message to the AI
      return {
        content: [{
          type: 'text',
          text: e instanceof Error ? e.message : String(e)
        }],
        isError: true
      }
    }

    return toToolResponse(await runQualityFixForFiles(resolvedFiles))
  }
)

if (shouldUseCliMode(process.argv)) {
  const code = await runCli(process.argv)
  process.exit(code)
}

try {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[ai-quality-gate] MCP Server started')
} catch (error) {
  console.error('[ai-quality-gate] Fatal error:', error)
  process.exit(1)
}
