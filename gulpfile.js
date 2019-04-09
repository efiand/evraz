'use strict';
var isDevMode = true;
var dest = 'dev';
var src;
var stream;

var concat = require('gulp-concat');
var del = require('del');
var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var replace = require('gulp-replace-task');
var run = require('run-sequence');
var server = require('browser-sync').create();

gulp.task('html', function () {
  var njkRender = require('gulp-nunjucks-render');
  stream = gulp.src('source/njk/pages/**/*.njk')
    .pipe(njkRender({
      path: 'source/njk',
      data: {
        isDevMode: isDevMode
      }
    }));
  if (!isDevMode) {
    var htmlmin = require('gulp-htmlmin');
    stream = stream
      .pipe(htmlmin({
        collapseWhitespace: true
      }));
  }
  return stream
    .pipe(gulp.dest(dest))
    .pipe(server.stream());
});

gulp.task('css', function () {
  var autoprefixer = require('autoprefixer');
  var cssmin = require('gulp-csso');
  var mqpacker = require('css-mqpacker');
  var postcss = require('gulp-postcss');
  var sass = require('gulp-sass');
  stream = gulp.src('source/sass/style.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(postcss([
      mqpacker(),
      autoprefixer()
    ]));
  if (!isDevMode) {
    var csscomb = require('gulp-csscomb');
    stream = stream
      .pipe(csscomb())
      .pipe(replace({
        patterns: [{
          match: /}(?=\n[^\n}])/g,
          replacement: '}\n'
        }],
        usePrefix: false
      }))
      .pipe(gulp.dest(dest + '/css'))
      .pipe(cssmin())
      .pipe(rename('style.min.css'));
  }
  return stream
    .pipe(gulp.dest(dest + '/css'))
    .pipe(server.stream());
});

gulp.task('sprite', function () {
  var spritesmith = require('gulp.spritesmith');
  var spriteData = gulp.src('source/img/sprite/*.png')
    .pipe(spritesmith({
      algorithm: 'top-down',
      algorithmOpts: {
        sort: false
      },
      padding: 1,
      imgName: 'sprite.png',
      cssName: 'sprite.css'
    }));
  spriteData.img.pipe(gulp.dest(dest + '/img'));
  spriteData.css.pipe(gulp.dest(dest + '/tmp'));
});

gulp.task('sprite:optim', function () {
  return gulp.src(dest + '/img/sprite.png')
    .pipe(imagemin([
      imagemin.optipng()
    ]))
    .pipe(gulp.dest(dest + '/img'));
});

gulp.task('img', function () {
  var jpegoptim = require('imagemin-jpegoptim');
  stream = gulp.src('source/img/*.{png,jpg,svg}');
  if (!isDevMode) {
    stream
      .pipe(imagemin([
        imagemin.svgo(),
        imagemin.optipng(),
        jpegoptim({
          max: 70,
          progressive: true
        })
      ]));
  }
  return stream
    .pipe(gulp.dest(dest + '/img'));
});

gulp.task('webp', function () {
  var webp = require('gulp-webp');
  return gulp.src('source/img/*.{png,jpg}')
    .pipe(webp({
      quality: 70
    }))
    .pipe(gulp.dest(dest + '/img'));
});

gulp.task('copy', function () {
  src = [
    'source/fonts/**/*.{woff,woff2}'
  ];
  var options = {
    base: 'source'
  };
  return gulp.src(src, options)
    .pipe(gulp.dest(dest));
});

gulp.task('build:del', function () {
  return del('build');
});

gulp.task('dev', function (done) {
  src = [
    'copy',
    'html',
    'css',
    'sprite',
    'img',
    'webp'
  ];
  run(src, 'sprite:optim', done);
});

gulp.task('clean', function () {
  return del(['build']);
});

gulp.task('clean:tmp', function () {
  return del(['build/tmp']);
});

gulp.task('build', function (done) {
  isDevMode = false;
  dest = 'build';
  run('clean', 'dev', 'clean:tmp', done);
});

gulp.task('serve', function () {
  server.init({
    server: dest,
    notify: false,
    open: true,
    cors: true,
    ui: false
  });
  gulp.watch('source/sass/**/*.{scss,sass}', ['css']);
  gulp.watch('source/njk/**/*.njk', ['html']);
});
