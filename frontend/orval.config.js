import { defineConfig } from 'orval'

export default defineConfig({
  'ecamp3-api': {
    input:
      '../api/tests/Api/SnapshotTests/__snapshots__/ResponseSnapshotTest__testOpenApiSpecMatchesSnapshot__1.yml',
    output: './types/api.ts',
  },
})
