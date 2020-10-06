// TODO: enable dev/prod modes
// TODO: documentation
const { watch, series, parallel, src, dest } = require('gulp');
const clean_css = require('gulp-clean-css');
const concat = require('gulp-concat');
const minify_js = require('gulp-minify');
const rev = require('gulp-rev');
const rev_rewrite = require('gulp-rev-rewrite');
const del = require('del');
const htmlmin = require('gulp-htmlmin');
const browser_sync = require('browser-sync').create();
const argv = require('yargs').argv;
const hostile = require('hostile');
const sass = require('gulp-sass');
const obfuscateEmail = require('gulp-hide-email');
sass.compiler = require('node-sass');

const app = require('assemble')();

function html(cb) {
    var manifest = src('docs/rev-manifest.json',{allowEmpty: true});
    app.pages('src/html/*.html');
    app.partials('src/html/partials/*.html');

    app.toStream('pages')
        .pipe(app.renderFile())
        .pipe(rev_rewrite({manifest}))
        .pipe(obfuscateEmail({verbose: false}))
        //.pipe(htmlmin({
            //collapseWhitespace: true,
            //removeComments: true
        //}))
        .pipe(app.dest('docs'));

    cb();
}

function css(cb) {
    del.sync(['docs/*.css'], {force: true});

    return src(
        [
            'src/sass/style.scss'
        ]
    )
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('style.min.css'))
        .pipe(clean_css())
        .pipe(rev())
        .pipe(dest('docs'))
        .pipe(rev.manifest('docs/rev-manifest.json', {
            base: 'docs',
            merge:true
        }))
        .pipe(dest('docs'));
}

function js(cb) {
    del.sync(['docs/*.js'], {force: true});

    return src([
        'src/javascript/main.js'
    ])
        .pipe(minify_js({noSource: true}))
        .pipe(concat('javascript.min.js'))
        .pipe(rev())
        .pipe(dest('docs'))
        .pipe(rev.manifest('docs/rev-manifest.json', {
            base: 'docs',
            merge:true
        }))
        .pipe(dest('docs'));
}

function files(cb) {
    src(['src/images/**/*.*'])
        .pipe(dest('docs/images/'));

    src(['src/fonts/**/*.*'])
        .pipe(dest('docs/fonts/'));

    cb();
}

function wc() {
    console.info("== Watching Files ==");

    watch('src/html/**/*.*', html);
    watch('docs/rev-manifest.json', html);
    watch('src/sass/**/*.*', css, html);
    watch('src/javascript/**/*.*', js, html);
    watch(['src/images/**/*.*', 'src/fonts/**/*.*'], files);
}

function set_hostname(cb) {
    hostile.set('127.0.0.1', 'frontroot.com', function (err) {
        if (err) {
            console.error(err)
        } else {
            console.log('set /etc/hosts successfully!')
        }
    });

    cb();
}

function browser_reload(cb) {
    console.info("== Launching Browser Reload ==");

    browser_sync.init({
        server: "docs",
        port: 8822
    });

    watch('docs/*.html').on('change', browser_sync.reload);

    cb();
}

function clean(cb) {
    return del(['docs/*'], {force: true});
}

const defaultTask = series(
    set_hostname,
    browser_reload,
    wc
);

const regenerate = series(
    clean,
    css,
    js,
    files,
    html
);

defaultTask.description = "run the environment";

module.exports = {
    default: defaultTask,
    regenerate: regenerate,
    html,
    css,
    js,
    files,
    clean,
    wc,
    browser_reload,
};
