import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import glob from 'fast-glob'
import { resolveFilePath } from './resolveFilePath'

vi.mock('node:fs')
vi.mock('fast-glob', () => ({
  default: {
    sync: vi.fn().mockReturnValue([])
  },
  sync: vi.fn().mockReturnValue([])
}))

describe('resolveFilePath', () => {
  const workspaceRoot = '/Users/test/workspace'
  const cwd = '/Users/test/workspace/some/deep/dir'
  const originalCwd = process.cwd

  beforeEach(() => {
    process.cwd = vi.fn().mockReturnValue(cwd)
  })

  afterEach(() => {
    vi.resetAllMocks()
    process.cwd = originalCwd
  })

  it('should return the file if it is an absolute path and exists', () => {
    const absPath = '/Users/test/workspace/file.ts'
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => p === absPath)
    
    expect(resolveFilePath(absPath, workspaceRoot)).toBe(absPath)
  })

  it('should resolve relative path against workspaceRoot if it exists there', () => {
    const relPath = 'src/app.ts'
    const expectedPath = path.join(workspaceRoot, relPath)
    
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => p === expectedPath)
    
    expect(resolveFilePath(relPath, workspaceRoot)).toBe(expectedPath)
  })

  it('should resolve relative path against process.cwd if not in workspaceRoot but in cwd', () => {
    const relPath = 'app.ts'
    const fromWorkspaceRoot = path.join(workspaceRoot, relPath)
    const fromCwd = path.join(cwd, relPath)
    
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      // It does NOT exist in workspaceRoot, but DOES exist in cwd
      return p === fromCwd
    })
    
    expect(resolveFilePath(relPath, workspaceRoot)).toBe(fromCwd)
  })

  it('should throw an error with clear messages if file cannot be found anywhere', () => {
    const relPath = 'nonexistent.ts'
    
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    
    expect(() => resolveFilePath(relPath, workspaceRoot)).toThrow(
      /File not found: nonexistent\.ts[\s\S]*Searched in:[\s\S]*- \/Users\/test\/workspace\/nonexistent\.ts[\s\S]*- \/Users\/test\/workspace\/some\/deep\/dir\/nonexistent\.ts[\s\S]*Workspace root: \/Users\/test\/workspace/
    )
  })
})
