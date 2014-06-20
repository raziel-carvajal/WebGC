/** 
* @module lib/algorithms */
(function(exports){
  /**
  * @class Cyclon
  * @augments GossipProtocol
  * @classdesc This class implements the goosip-base algorithm Cyclon. The local view is 
  * basically a set of ID's, each ID identifies a remote peer. Each key in the view 
  * GossipProtocol.view is the ID of a remote peer and each key points 
  * to an object that contains an age field (timestamp) and a data field (application dependent).
  * @param {Object} options - Configuration of the gossip-based protocol.
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr> */
  function Cyclon(opts){
    this.log = new Logger(opts.loggingServer);
    this.log.setOutput(opts.peerId, this.constructor.name);
    this.gossipUtil = new GossipUtil({loggingServer: opts.loggingServer});
    this.gossipUtil.log.setOutput(opts.peerId, this.constructor.name);
    GossipProtocol.call(this, opts);
  }
  /**
  * @desc This object represents the configuration by default of this protocol. During the
  * instantiation of this object (via the Factory object) if the options are not defined
  * the default configuration will be taken into account. 
  * @property {Object} defaultOpts - Default configuration of this gossip-based protocol.
  * @default */
  Cyclon.defaultOpts = {
    class: 'Cyclon',
    data: '?',
    viewSize: 10,
    fanout: 5,
    periodTimeOut: 10000,
    propagationPolicy: { push: true, pull: true }
  };
  util.inherits(Cyclon, GossipProtocol);
  /** 
  * @desc See method GossipProtocol.selectPeer() for more information. Particularly,
  * this method selects the remote peer's identifier with the oldest age.*/
  Cyclon.prototype.selectPeer = function(){
    return this.gossipUtil.getOldestKey(this.view);
  };
  /**
  * @method getItemsToSend
  * @desc See method GossipProtocol.getItemsToSend() for more information. Paricularly,
  * the selection of peers is performed in a randomly way.*/
  Cyclon.prototype.getItemsToSend = function(thisId, dstPeer, thread){
    var subDict = {};
    switch( thread ){
      case 'active':
        delete this.view[dstPeer];
        subDict = this.gossipUtil.getRandomSubDict(this.fanout - 1, this.view);
        subDict[thisId] = this.gossipUtil.newItem(0, this.data);
      break;
      case 'passive':
        subDict = this.gossipUtil.getRandomSubDict(this.fanout, this.view);
      break;
      default:
        this.log.error('Unknown selection policy');
      break;
    }
    return subDict;
  };
  /**
  * @method selectItemsToKeep
  * @desc See method GossipProtocol.selectItemsToKeep() for more information.*/
  Cyclon.prototype.selectItemsToKeep = function(thisId, rcvCache){
    var rcvKeys = Object.keys(rcvCache);
    if( rcvKeys.length === 0 )
      return;
    var i;
    var currentKeys = Object.keys(this.view);
    if( currentKeys.length === 0 ){
      i = 0;
      do{
        this.view[ rcvKeys[i] ] = rcvCache[ rcvKeys[i] ];
        i += 1;
      }while( i < rcvKeys.length && Object.keys(this.view).length < this.viewSize );
    }else{
      var newCache = {};
      if( thisId in rcvCache ){
        delete rcvCache[thisId];
        rcvKeys = Object.keys(rcvCache);
      }
      for( i = 0; i < rcvKeys.length; i += 1 ){
        if( !(rcvKeys[i] in this.view) )
          newCache[ rcvKeys[i] ] = rcvCache[ rcvKeys[i] ];
      }
      i = 0;
      while( Object.keys(newCache).length <= this.viewSize && i < currentKeys.length ){
        newCache[ currentKeys[i] ] = this.view[ currentKeys[i] ];
        i += 1;
      }
      this.view = newCache;
    }
  };
  /** 
  * @method initialize
  * @desc See method GossipProtocol.initialize() for more information.*/
  Cyclon.prototype.initialize = function(keys){
    if( keys.length > 0 ){
      for( var i in keys )
        this.view[ keys[i] ] = this.gossipUtil.newItem(0, '?');
    }
  };
  /** 
  * @method increaseAge
  * @desc See method GossipProtocol.increaseAge() for more information.*/
  Cyclon.prototype.increaseAge = function(){
    for( var key in this.view )
      this.view[key].age += 1;
  };
  /** 
  * @method setData 
  * @desc This method updates the value of the property 'data' from one item in 
  * GossipProtocol.view 
  * @param {String} key - ID of the item to update.
  * @param {Object} data - New value for the data property*/
  Cyclon.prototype.setData = function(key, data){ this.view[key].data = data; };
  /** 
  * @method getLog
  * @desc See method GossipProtocol.getLog() for more information.*/
  Cyclon.prototype.getLog = function(){
    var cacheTrace = '['; var limit;
    var cacheKeys = Object.keys(this.view);
    if( cacheKeys.length === 0 )
      cacheTrace += ']';
    else{
      limit = cacheKeys.length - 1;
      for(var i = 0; i < limit; i += 1)
        cacheTrace += '(' + cacheKeys[i] + ', ' + this.view[ cacheKeys[i] ].age + '), ';
      cacheTrace += '(' + cacheKeys[limit] + ', ' + this.view[ cacheKeys[limit] ].age + ')]';
    }
    return cacheTrace;
  };
  /**/
  Cyclon.prototype.getPlotInfo = function(peerId){ 
    return {peer: peerId, profile: this.data, loop: this.loop, view: Object.keys(this.view)};
  };
  exports.Cyclon = Cyclon;
  
})(this);
