const postcss = require('postcss')
const vars = require('postcss-simple-vars')
const pFunctions = require('postcss-functions')
const transformValue = require('postcss-functions/src/transform').transformValue

// Todo: test nested @rules

var varss = {}
var functions = {
  n (i) {
    return i + 'n'
  },
  nth (i, list) {
    return list.split(/\s/g)[i - 1]
  },
  length (list) {
    return list.split(/\s/g).length
  }
}
var rules = {
  macro (params, body) {
    var match = params.match(/^\s*([a-z0-9]+)\s*\(([^)]+)\)\s*$/)
    var [, name, args] = match
    rules[name] = vals => (function (vals, body) {
      body = body.toString()
      vals = vals.split(',')
      args.split(',').forEach((arg, ix) => {
        body = body.replace(arg.trim(), vals[ix].trim())
      })
      return postcss.parse(body)
    })(vals, body)
    return postcss.root()
  },
  for: function (params, body) {
    var match = params.match(/^\s*(\S+)\s+from\s+(\S+)\s+to\s+(\S+)\s*$/)
    var [, name, ...range] = match
    range = range.map(r => transformValue(r.replace(/\$(.+)\b/g, ($0, $1) => {
      return varss[$1]
    }), functions))
    var root = postcss.root()

    for (var i = range[0]; i <= range[1]; i++) {
      root.append(postcss.parse(body.toString().split(name).join(i)))
    }
    return root
  }
}

const plugins = [
  vars({
    variables: () => varss
  }),
  pFunctions({
    functions
  })
]

const process = root => {
  plugins[0](root)
  root.walkRules(node => {
    node.selector = (node.selector.replace(/(\:[a-z-]+)\((.*)\)$/i,
    ($0, $1, $2) => $1 + '(' + transformValue($2, functions) + ')'
  )
  )
  })
  return plugins[1](root)
}

function splitTree (node) {
  var parent = node.parent
  var cloneParent = parent.clone()
  cloneParent.removeAll()
  var next
  while (next = node.next()) {
    cloneParent.append(next)
  }

  if (parent.parent) {
    let cloneGrandparent = splitTree(parent)
    cloneGrandparent.prepend(cloneParent)
  }

  return cloneParent
}

function joinTree (host, donor) {
  while (host.last) {
    donor.prepend(host.last)
  }

  var hostParent = host.parent

  if (hostParent) {
    host.remove()

    joinTree(hostParent, donor.parent)
  }
}

const plugin = postcss.plugin('my-plugin', o => function run (css, result) {
  var segments = []
  var walkResult

  do {
    walkResult = css.walkAtRules(node => {
      var parent = node.parent
      var cloneParent = splitTree(node)
      node.remove()

      segments.push([parent, node, cloneParent])

      css = cloneParent.root()
      return false
    })
  } while (walkResult === false)

  var processSegment = n => {
    var root = segments[n][0].root()
    return process(root).then(() => {
      var newRoot = postcss.root()
      var rule = segments[n][1]
      if (rule.nodes) {
        newRoot.append(rule.nodes)
      }
      if (rules[rule.name]) {
        newRoot = rules[rule.name](rule.params, newRoot)
      }
      return Promise.resolve(newRoot).then(newRoot =>
        process(newRoot).then(() => {
          segments[n][0].append(newRoot.nodes)
        })
      )
    }).then(() => {
      if (segments[n + 1]) {
        return processSegment(n + 1)
      }
    })
  }

  return processSegment(0).then(() =>
    process(css)
  ).then(() => {
    segments.forEach(([before, node, after]) => {
      joinTree(before, after)
    })

    result.root = segments.pop().pop().root()
    return
  })
}
)

module.exports = plugin
