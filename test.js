const plugin = require('.')
const postcss = require('postcss')

postcss([plugin()])
  .process(
    `
    $myVar: 7;

    .example{
      color: fn($myVar);
    }

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

    $list: a b c d;
    $len: length($list);

    *:not(h2:nth-child($myVar)) {
      color: blue
    }

    @for $i from 1 to $len {
      .test:nth-child(n($i) + $len) {
        color: nth($i, $list)
      }
    }
  `
  )
  .then(result => console.log(result.css), err => console.log(err))
