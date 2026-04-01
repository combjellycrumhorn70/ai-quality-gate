import fs from 'node:fs'
import path from 'node:path'
import glob from 'fast-glob'

/**
 * Resolves a potentially relative file path to an absolute path.
 *
 * 1. Return immediately if already absolute
 * 2. Try resolving from the workspace root
 * 3. Try resolving from the current working directory
 * 4. Fallback to glob pattern search (for complex paths)
 * 5. If all fail, throw a clean, structured error message
 */
export function resolveFilePath(filePath: string, workspaceRoot: string): string {
  // 1. Return immediately if already absolute
  if (path.isAbsolute(filePath)) {
    if (fs.existsSync(filePath)) {
      return filePath
    }

    throw new Error(`Absolute path does not exist: ${filePath}`)
  }

  // 2. Try resolving from the workspace root
  const fromWorkspaceRoot = path.join(workspaceRoot, filePath)

  if (fs.existsSync(fromWorkspaceRoot)) {
    return fromWorkspaceRoot
  }

  // 3. Try resolving from the current working directory
  const fromCwd = path.join(process.cwd(), filePath)

  if (fs.existsSync(fromCwd)) {
    return fromCwd
  }

  // 4. Try glob pattern (for complex paths)
  const globbed = glob.sync(filePath, { cwd: workspaceRoot, absolute: true })
  const firstMatch = globbed[0]

  if (globbed.length === 1 && firstMatch) {
    return firstMatch
  }

  // 5. If all fail, throw a detailed error
  throw new Error(
    `File not found: ${filePath}\n` +
      `Searched in:\n` +
      `  - ${fromWorkspaceRoot}\n` +
      `  - ${fromCwd}\n` +
      `Workspace root: ${workspaceRoot}`
  )
}
