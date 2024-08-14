import { spawn } from 'child_process';
import { context, build } from 'esbuild';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2), { '--': true });

const defaultBuildOptions = {
    platform: 'node',
    bundle: true,
    charset: 'utf8',
    format: 'cjs',
    legalComments: 'none',
};

if (args.watch) {
    let runtime;

    const buildOptions = {
        ...defaultBuildOptions,
        entryPoints: ['src/index.ts'],
        outdir: '.dev',
        sourcemap: true,
        plugins: [
            {
                name: 'watch-and-run',
                setup(build) {
                    build.onEnd(() => {
                        if (runtime) {
                            runtime.kill(9);
                        }
                        runtime = spawn(process.argv[0], [`${buildOptions.outdir}/index.js`, ...args['--']], {
                            stdio: ['inherit', 'pipe', 'inherit'],
                        });
                        const pretty = spawn('node_modules/.bin/pino-pretty', {
                            stdio: ['pipe', 'inherit', 'inherit'],
                        });
                        runtime.stdout.pipe(pretty.stdin);
                    });
                },
            },
        ],
    };
    const ctx = await context(buildOptions);
    await ctx.watch();
} else {
    await build({
        ...defaultBuildOptions,
        entryPoints: ['src/index.ts'],
        outdir: './dist',
        minify: true,
    });
}
