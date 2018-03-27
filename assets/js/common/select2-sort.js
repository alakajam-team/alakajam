function compareByText (a, b) {
  if (a.text < b.text) return -1
  if (a.text > b.text) return 1
  return 0
}

function compareByValue (a, b) {
  if (a.value < b.value) return -1
  if (a.value > b.value) return 1
  return 0
}

function sort (comparator, results) {
  return results.sort(comparator)
}

module.exports = {
  byText: sort.bind(compareByText),
  byValue: sort.bind(compareByValue)
}
