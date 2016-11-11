module.exports.search = function(str, pattern) {
  if (pattern instanceof RegExp) return str.search(pattern)
  else return str.indexOf(pattern)
}
