/**
*@module src/superObjs*/
module.exports = ViewSelector
/**
* @class ViewSelector
* @description Ranks items in a gossip view according to a similarity function, this function
* evaluates to which extend two peer profiles differs from each other.
* @param profile Profile of the local peer
* @param debug debug (see [LoggerForWebWorker]{@link module:src/utils#LoggerForWebWorker}) to
* monitor the actions of the ViewSelector
* @param simFunc Reference to the similarity function
* @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com> */
function ViewSelector (profile, debug, simFunc) {
  this.profile = profile
  this.debug = debug
  this.simFunc = simFunc
}
/**
* @memberof ViewSelector
* @method getClosestNeighbours
* @description This method gets the N most similar items in the local peer's view
* @param n Number of the most similar items to the local peer
* @param view Source where the most similar items are taken
* @param newItem This item contains the ID of the local peer, the local peer's profile and its age
* initialize to zero
* @returns Object Subset of the local peer's view with the n most similar peers*/
ViewSelector.prototype.getClosestNeighbours = function (n, view) {
  var keys = Object.keys(view)
  if (n <= 0 || keys.length === 0 || keys.length < n) {
    this.debug('Base case in SimFun')
    return view
  }
  return this.getNsimilarPeers(view, n, keys)
}
/**
* @memberof ViewSelector
* @method getNsimilarPeers
* @description This method gets the N most similar items in the local peer's view
* @param n Number of the most similar items to the local peer
* @param view Source where the most similar items are taken
* @param keys Properties of the object that represents the local peer's view
* @returns Object Subset of the local peer's view with the n most similar peers*/
ViewSelector.prototype.getNsimilarPeers = function (view, n, keys) {
  var values = []
  var i
  for (i = 0; i < keys.length; i++) {
    values.push({
      k: keys[i],
      v: this.simFunc(this.profile, view[ keys[i] ].data)
    })
  }
  values.sort(function (a, b) { return a.v - b.v }).reverse()
  var result = {}
  var itm
  i = 0
  while (i < n && i < values.length) {
    itm = view[ values[i].k ]
    itm.ev = values[i].v
    itm.ev = itm.ev.toFixed(3)
    result[ values[i].k ] = itm
    i++
  }
  return result
}
