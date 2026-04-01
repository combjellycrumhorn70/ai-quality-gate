import path from 'node:path'
import fs from 'node:fs'
import { describe, it, expect, vi } from 'vitest'
import { detectWorkspaceRoot } from './detectWorkspaceRoot'

vi.mock('node:fs')

describe('detectWorkspaceRoot', () => {
  it('should find root when package.json is in current char', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation(p => p.toString().endsWith('package.json'))
    const root = detectWorkspaceRoot('/users/test')
    expect(root).toBe('/users/test')
  })

  it('should find root traversing up', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation(
      p =>
        // Simulate package.json only at /users/test
        p === path.join('/users/test', 'package.json')
    )

    // start at a deeper path
    const root = detectWorkspaceRoot('/users/test/src/components')
    expect(root).toBe('/users/test')
  })

  it('should return original path if no marker found', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    const root = detectWorkspaceRoot('/users/test/deep')
    expect(root).toBe('/users/test/deep')
  })
})
