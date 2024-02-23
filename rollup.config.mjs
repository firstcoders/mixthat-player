import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import filesize from 'rollup-plugin-filesize';
import minifyHTML from 'rollup-plugin-minify-html-literals';

export default [
  {
    input: 'mixthat-player.js',
    watch: {
      include: 'src/**',
    },
    output: [
      {
        file: 'dist/mixthat-player-lean.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    external: ['lit'],
    preserveSymlinks: true,
    plugins: [
      resolve(),
      minifyHTML.default(),
      filesize({
        showGzippedSize: true,
        showBrotliSize: false,
        showMinifiedSize: false,
      }),
      ...(process.env.NODE_ENV !== 'development'
        ? [
            terser({
              // ecma: 2020,
              // module: true,
              warnings: true,
            }),
          ]
        : []),
    ],
    preserveEntrySignatures: 'strict',
  },

  {
    input: 'mixthat-player.js',
    watch: {
      include: 'src/**',
    },
    output: [
      {
        file: 'dist/mixthat-player.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    preserveSymlinks: true,
    plugins: [
      resolve(),
      minifyHTML.default(),
      filesize({
        showGzippedSize: true,
        showBrotliSize: false,
        showMinifiedSize: false,
      }),
      ...(process.env.NODE_ENV !== 'development'
        ? [
            terser({
              // ecma: 2020,
              // module: true,
              warnings: true,
            }),
          ]
        : []),
    ],
    preserveEntrySignatures: 'strict',
  },
];
