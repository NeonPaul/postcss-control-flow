const plugin = require('.')
const postcss = require('postcss')

var processor = postcss([plugin()])
Promise.all([
processor.process(`
  @macro friend($myVar) {
    .cls {
      prop: $myVar;
    }
  }

  @friend 11px;

  .test {
    bug: red;
    @friend 22em;
    frog: yellow;
  }
  `).then(result => {
    console.log(result.css.trim() === `.cls {
      prop: 11px;
    }
.test {
    bug: red;
    .cls {
      prop: 22em;
    }
    frog: yellow;
  }`)
}),

  processor.process(
    `
    $myVar: 7;

    .example{
      color: $myVar;
    }`).then(result => {
      console.log(result.css.trim() === `.example{
      color: 7;
    }`)
  }, e=> console.log(e)),

processor.process(`
    $list: a b c d;
    $len: length($list);

    @for $i from 1 to $len {
      .test:nth-child(n($i) + $len) {
        color: nth($i, $list)
      }
    }
  `
  )
  .then(result => console.log(result.css.trim()===`.test:nth-child(1n + 4) {
        color: a
      }
.test:nth-child(2n + 4) {
        color: b
      }
.test:nth-child(3n + 4) {
        color: c
      }
.test:nth-child(4n + 4) {
        color: d
      }`))
]).then(
  r=> console.log('Done'),
  e =>{ console.log(e); process.exit(1)}
)
