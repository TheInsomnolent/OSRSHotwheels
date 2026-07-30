import { describe, expect, it } from 'vitest'
import { skillIconUrl } from '../src/data/icons'
import { SKILLS } from '../src/data/skills'

describe('skill icons', () => {
  it('provides an OSRS sprite data URL for every skill', () => {
    for (const skill of SKILLS) {
      const url = skillIconUrl(skill.id)
      expect(url, `missing icon for ${skill.id}`).toBeDefined()
      expect(url).toMatch(/^data:image\/(png|gif);base64,/)
    }
  })
})
