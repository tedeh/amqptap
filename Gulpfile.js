var jshint = require('gulp-jshint');
var gulp   = require('gulp');

gulp.task('lint', function() {
  var paths = [
    __dirname + '/index.js',
    __dirname + '/bin/*.js'
  ];
  return gulp.src(paths)
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});
