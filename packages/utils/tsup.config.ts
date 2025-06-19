import { defineConfig } from 'tsup';

// TODO: fseventsエラー（macOS専用ファイル監視ライブラリの.nodeファイル処理）
// 現在Web版は正常動作しているため、マルチプラットフォーム対応時に修正予定
// 参考: https://github.com/egoist/tsup/issues/619
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['fsevents'],
});
