/**
*@module src/utils*/
// TODO Find a way to export (NodeJS fashion) in a Web Worker scope, because "require" could be
// used with "workerify" but not in "webworker-threads" for NodeJS. Now the solution is to
// remove every require (which isn't elegant) and replace it whith the anonymous function to
// export. Other solution could be to edit the sources on the fly adding the right headers
module.exports = GossipUtil
/**
* @class GossipUtil
* @description This class contains miscellaneous operations used by gossip protocols.
* @author Raziel Carvajal-Gomez <raziel.carvajal@gmail.com>*/
function GossipUtil (debug) {
  if (!(this instanceof GossipUtil)) return GossipUtil(debug)
  this.debug = debug
  this.electionLimit = 2
  this.alreadyChosen = []
  this._loopOfElection = 0
  this._algorithmsDb = ['algorithms/Vicinity.js', 'algorithms/Cyclon.js']
  debug('GossipUtil.init')
}
/**
* @memberof GossipUtil
* @method newItem
* @description Returns one object with two properties: its age (time stamp) and its data
* (application dependant object).
* @param age Age of the item (integer)
* @param data Object to share by the gossip protocol (application dependant)
* @return Object Object with the properties age and data*/
GossipUtil.prototype.newItem = function (age, data) { return { age: age, data: data } }
/**
* @memberof GossipUtil
* @method getRandomSubDict
* @description Get a random set of n items from one object
* @param n Size of the new object
* @param src Original object
* @returns Object Object with a subset of items from the source*/
GossipUtil.prototype.getRandomSubDict = function (n, src) {
  var keys = Object.keys(src)
  if (n <= 0 || keys.length === 0) return {}
  if (n >= keys.length) return src
  else {
    var keys = Object.keys(src)
    var tmpDict = {}
    var result = {}
    var key, tmpAr, i
    for (i = 0; i < keys.length; i++) tmpDict[ keys[i] ] = 1
    i = 0
    do {
      tmpAr = Object.keys(tmpDict)
      key = tmpAr[ Math.floor(Math.random() * tmpAr.length) ]
      result[key] = src[key]
      delete tmpDict[key]
      i++
    } while (i !== n)
    return result
  }
}
/**
* @memberof GossipUtil
* @method getOldestKey
* @description Get the key of the element with the oldest age in the object
* @param dictio Source object
* @returns String Key of the item with the oldest age*/
GossipUtil.prototype.getOldestKey = function (dictio) {
  var keys = Object.keys(dictio)
  if (keys.length === 0) {
    this.debug('Empty dictionary')
    return null
  }
  // var i
  var items = []
  //this._loopOfElection++
  //if (this._loopOfElection === this.electionLimit) {
  //  this.alreadyChosen = []
  //  this._loopOfElection = 0
  //}
  for (var i = 0; i < keys.length; i++) items.push({ k: keys[i], v: dictio[ keys[i] ].age })
  items.sort().reverse()
  return items[0].k
  //for (i = 0; i < items.length; i++) {
  //  // items[i].v IN this.alreadyChosen ?
  //  if (this.alreadyChosen.indexOf(items[i].k, 0) === -1) {
  //    this.alreadyChosen.push(items[i].k)
  //    return items[i].k
  //  }
  //}
  //return null
}
/**
* @memberof GossipUtil
* @method getRandomKey
* @description Get a random key from one object
* @param dict Source object
* @returns String Random key from the source*/
GossipUtil.prototype.getRandomKey = function (dict) {
  var keys = Object.keys(dict)
  var key
  if (keys.length === 0) {
    this.debug('No way to return a key from an empty dictionary')
  } else {
    var rNum = keys.length === 1 ? 0 : Math.floor(Math.random() * keys.length)
    key = keys[rNum]
  }
  return key
}
/**
* @memberof GossipUtil
* @method removeRandomly
* @description Removes N elements from one object in a randomly way
* @param n Number of elements to remove
* @param dic Source object*/
GossipUtil.prototype.removeRandomly = function (n, dic) {
  if (n === 0) {
    return
  } else {
    var tmpDic = {}
    var tmpAr, i, key
    var keys = Object.keys(dic)
    for (i = 0; i < keys.length; i++) tmpDic[keys[i]] = 1
    for (i = 0; i < n; i++) {
      tmpAr = Object.keys(tmpDic)
      key = tmpAr[Math.floor(Math.random() * tmpAr.length)]
      delete tmpDic[key]
      delete dic[key]
    }
  }
}
/**
* @memberof GossipUtil
* @method mergeViews
* @description Merge two objects, the result does not contain repetitions
* @param v1 First object to merge
* @param v2 Second object to merge
* @returns Object The result of merging v1 and v2*/
GossipUtil.prototype.mergeViews = function (v1, v2) {
  var keysV1 = Object.keys(v1)
  var keysV2 = Object.keys(v2)
  var i
  var result = {}
  for (i = 0; i < keysV1.length; i++) result[ keysV1[i] ] = v1[ keysV1[i] ]
  for (i = 0; i < keysV2.length; i++) {
    if (Object.keys(result).indexOf(keysV2[i], 0) !== -1) {
      if (v2[ keysV2[i] ].age < result[ keysV2[i] ].age) result[ keysV2[i] ].age = v2[ keysV2[i] ].age
    } else {
      result[ keysV2[i] ] = v2[ keysV2[i] ]
    }
  }
  return result
}
/**
* @memberof GossipUtil
* @method extendProperties
* @description Increases the number of properties/values from one object
* @param dst Object to extend
* @param src The properties/values of this object will be part of the destination object*/
GossipUtil.prototype.extendProperties = function (dst, src) {
  var keys = Object.keys(src)
  for (var i = 0; i < keys.length; i++) {
    if (!dst.hasOwnProperty(keys[i])) dst[keys[i]] = src[keys[i]]
  }
}
